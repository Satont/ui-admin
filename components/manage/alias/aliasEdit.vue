<template>
  <div>
    <v-menu
      v-model="menu"
      offset-y
      :close-on-click="false"
      min-width="600"
      :close-on-content-click="false"
      offset-overflow
    >
      <template #activator="{ on, attrs }">
        <v-btn v-if="item.id !== undefined" v-bind="attrs" small v-on="on">
          <v-icon left>
            mdi-pencil
          </v-icon>
          Edit
        </v-btn>
        <v-btn v-else v-bind="attrs" color="primary" v-on="on">
          New item
        </v-btn>
      </template>
      <v-card outlined>
        <v-card-text>
          <v-form ref="form" v-model="valid" lazy-validation>
            <v-text-field
              v-model="item.alias"
              :label="translate('alias')"
              :rules="rules.alias"
              hide-details="auto"
              :clearable="true"
              required
              counter
            />

            <v-textarea
              v-model="item.command"
              hide-details="auto"
              :label="translate('command')"
              :rows="1"
              :rules="rules.command"
              counter
              :clearable="true"
              auto-grow
              required
              @keydown.enter.prevent
            />

            <v-select
              v-model="item.permission"
              :label="translate('permissions')"
              clearable
              :items="permissionItems"
              hide-details="auto"
            />

            <v-row no-gutters>
              <v-col>
                <v-switch
                  v-model="item.enabled"
                  :label="translate('enabled')"
                  persistent-hint
                  hide-details="auto"
                  :hint="(item.enabled
                    ? 'Alias is enabled'
                    : 'Alias is disabled')"
                />
              </v-col>
              <v-col>
                <v-switch
                  v-model="item.visible"
                  :label="capitalize(translate('visible'))"
                  persistent-hint
                  hide-details="auto"
                  :hint="(item.visible
                    ? 'Alias will be visible in lists'
                    : 'Alias won\'t be visible in lists')"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />

          <v-btn text @click="menu = false">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="saving" text :disabled="!valid" @click="save()">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </div>
</template>

<script lang="ts">
import { nextTick } from 'process';

import { defaultPermissions } from '@sogebot/ui-helpers/permissions/defaultPermissions';
import translate from '@sogebot/ui-helpers/translate';
import { useMutation } from '@vue/apollo-composable';
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';
import gql from 'graphql-tag';
import capitalize from 'lodash/capitalize';
import cloneDeep from 'lodash/cloneDeep';
import { v4 } from 'uuid';

import { error as errorLog } from '~/functions/error';
import { EventBus } from '~/functions/event-bus';
import type { AliasInterfaceUI } from '~/pages/commands/alias.vue';

type Props = {
  value: AliasInterfaceUI;
  rules: [];
};

const newAlias = {
  alias:      '',
  command:    '',
  enabled:    true,
  visible:    true,
  permission: defaultPermissions.VIEWERS,
  group:      null,
};

export default defineComponent({
  props: {
    value:           Object,
    rules:           Object,
    permissionItems: Array,
    groupItems:      Array,
  },
  setup (props: Props, ctx) {
    const menu = ref(false);
    const item = ref(cloneDeep(props.value || newAlias));
    const valid = ref(true);
    const form = ref(null);

    const { mutate: updateMutation, onDone: onDoneUpdate, onError: onErrorUpdate, loading: saving } = useMutation(gql`
      mutation setAlias($id: String!, $data: AliasInput!) {
        setAlias(id: $id, data: $data) {
          id
        }
      }`);
    function saveSuccess () {
      EventBus.$emit('snack', 'success', 'Data updated.');
    }
    onDoneUpdate(saveSuccess);
    onErrorUpdate(errorLog);

    const resetForm = () => {
      valid.value = true;
      if (form.value as unknown) {
        (form.value as unknown as HTMLFormElement).resetValidation();
        item.value = cloneDeep(props.value || newAlias);
        if (item.value.id) {
          setTimeout(() => {
            item.value.command = item.value.command + ' ';
            nextTick(() => {
              item.value.command = item.value.command.trim();
            });
          }, 200);
        }
      } else {
        setTimeout(() => {
          resetForm();
        }, 100);
      }
    };

    watch(menu, (val) => {
      if (val) {
        resetForm();
      }
    });

    const save = async () => {
      if ((form.value as unknown as HTMLFormElement).validate()) {
        // check validity
        for (const key of Object.keys(props.rules)) {
          for (const rule of (props.rules as any)[key]) {
            const ruleStatus = rule((item.value as any)[key]);
            if (ruleStatus === true) {
              continue;
            } else {
              EventBus.$emit('snack', 'red', `[${key}] - ${ruleStatus}`);
              return;
            }
          }
        }
        const { __typename, id, groupToBeShownInTable, ...data } = item.value;
        console.log('Updating', { data });

        await updateMutation({ id: id || v4(), data });
        menu.value = false;
        ctx.emit('save');
      }
    };

    return {
      menu, item, save, translate, capitalize, valid, saving, form,
    };
  },
});
</script>
