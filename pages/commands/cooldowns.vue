<template>
  <v-container fluid :class="{ 'pa-4': !$vuetify.breakpoint.mobile }">
    <v-alert
      v-if="!$store.state.$systems.find(o => o.name === 'cooldown').enabled"
      color="error"
      class="mb-0"
    >
      {{ translate('this-system-is-disabled') }}
    </v-alert>

    <v-data-table
      v-model="selected"
      calculate-widths
      show-select
      :search="search"
      :loading="state.loading !== ButtonStates.success"
      :headers="headers"
      :items-per-page="-1"
      :items="items"
      @current-items="saveCurrentItems"
    >
      <template #top>
        <v-sheet
          flat
          color="dark"
          class="my-2 pb-2 mt-0"
        >
          <v-row class="px-2" dense>
            <v-col align-self="center">
              <v-text-field
                v-model="search"
                :append-icon="mdiMagnify"
                label="Search"
                single-line
                hide-details
                class="pa-0"
              />
            </v-col>
            <v-col cols="auto" align-self="center">
              <cooldowns-edit
                :rules="rules"
                @save="refresh()"
              />
            </v-col>
          </v-row>

          <v-expand-transition>
            <v-sheet v-show="selected.length > 0" color="blue-grey darken-4" class="pa-2 mt-2">
              <v-row class="px-2" dense>
                <v-col cols="auto" align-self="center">
                  {{ selected.length }} items selected
                </v-col>
                <v-col cols="auto" align-self="center">
                  <v-row dense>
                    <v-col>
                      <cooldowns-batch
                        :length="selected.length"
                        :rules="rules"
                        @save="batchUpdate($event)"
                      />
                    </v-col>
                    <v-col>
                      <v-dialog
                        v-model="deleteDialog"
                        max-width="500px"
                      >
                        <template #activator="{ on, attrs }">
                          <v-btn
                            small
                            color="red"
                            v-bind="attrs"
                            v-on="on"
                          >
                            <v-icon left>mdi-delete</v-icon>
                            Delete
                          </v-btn>
                        </template>

                        <v-card>
                          <v-card-title>
                            <span class="headline">Delete {{ selected.length }} Item(s)?</span>
                          </v-card-title>

                          <v-card-text>
                            <v-data-table
                              dense
                              :items="selected"
                              :headers="headersDelete"
                              :items-per-page="-1"
                              hide-default-header
                              hide-default-footer
                            />
                          </v-card-text>
                          <v-card-actions>
                            <v-spacer />
                            <v-btn
                              text
                              @click="deleteDialog = false"
                            >
                              Cancel
                            </v-btn>
                            <v-btn
                              color="error"
                              text
                              @click="deleteSelected"
                            >
                              Delete
                            </v-btn>
                          </v-card-actions>
                        </v-card>
                      </v-dialog>
                    </v-col>
                  </v-row>
                </v-col>
              </v-row>
            </v-sheet>
          </v-expand-transition>
        </v-sheet>
      </template>

      <template #[`item.name`]="{ item }">
        <table-hover>
          <template #hide>
            {{ item.name }}
          </template>

          <template #show>
            <v-row dense>
              <v-col cols="auto">
                <cooldowns-edit
                  :rules="rules"
                  :value="item"
                  @save="refresh()"
                />
              </v-col>
              <v-col cols="auto">
                <v-btn color="red" small @click="selected = [item]; deleteDialog = true;">
                  <v-icon left>
                    mdi-delete
                  </v-icon>
                  Delete
                </v-btn>
              </v-col>
            </v-row>
          </template>
        </table-hover>
      </template>

      <template #[`item.count`]="{ item }">
        {{ item.count }}s
      </template>

      <template #[`item.type`]="{ item }">
        {{ translate(item.type) }}
      </template>

      <template #[`item.isEnabled`]="{ item }">
        <v-simple-checkbox
          v-model="item.isEnabled"
          disabled
        />
      </template>

      <template #[`item.isErrorMsgQuiet`]="{ item }">
        <v-simple-checkbox
          v-model="item.isErrorMsgQuiet"
          disabled
        />
      </template>

      <template #[`item.isOwnerAffected`]="{ item }">
        <v-simple-checkbox
          v-model="item.isOwnerAffected"
          disabled
        />
      </template>

      <template #[`item.isModeratorAffected`]="{ item }">
        <v-simple-checkbox
          v-model="item.isModeratorAffected"
          disabled
        />
      </template>

      <template #[`item.isSubscriberAffected`]="{ item }">
        <v-simple-checkbox
          v-model="item.isSubscriberAffected"
          disabled
        />
      </template>

      <template #[`item.isFollowerAffected`]="{ item }">
        <v-simple-checkbox
          v-model="item.isFollowerAffected"
          disabled
        />
      </template>
    </v-data-table>
  </v-container>
</template>

<script lang="ts">
import { mdiCheckboxMultipleMarkedOutline, mdiMagnify } from '@mdi/js';
import {
  defineAsyncComponent, defineComponent, onMounted, ref, watch,
} from '@nuxtjs/composition-api';
import { ButtonStates } from '@sogebot/ui-helpers/buttonStates';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { capitalize } from 'lodash';

import type { CooldownInterface } from '.bot/src/database/entity/cooldown';
import { error } from '~/functions//error';
import { EventBus } from '~/functions/event-bus';
import {
  minLength, minValue, required,
} from '~/functions/validators';

export type CooldownInterfaceUI = CooldownInterface & { count: number; __typename: string };

export default defineComponent({
  components: {
    'cooldowns-edit':  defineAsyncComponent({ loader: () => import('~/components/manage/cooldowns/cooldownsEdit.vue') }),
    'cooldowns-batch': defineAsyncComponent({ loader: () => import('~/components/manage/cooldowns/cooldownsBatch.vue') }),
  },
  setup () {
    const rules = { name: [required, minLength(2)], count: [required, minValue(30)] };

    const items = ref([] as CooldownInterfaceUI[]);
    const typeItems = [
      {
        text:     translate('global'),
        value:    'global',
        disabled: false,
      }, {
        text:     translate('user'),
        value:    'user',
        disabled: false,
      },
    ];
    const search = ref('');

    const selected = ref([] as CooldownInterfaceUI[]);
    const currentItems = ref([] as CooldownInterfaceUI[]);
    const saveCurrentItems = (value: CooldownInterfaceUI[]) => {
      currentItems.value = value;
    };
    const deleteDialog = ref(false);
    const selectable = ref(false);
    watch(selectable, (val) => {
      if (!val) {
        selected.value = [];
      }
    });

    const timestamp = ref(Date.now());

    const state = ref({ loading: ButtonStates.progress } as {
      loading: number;
    });

    const headers = [
      { value: 'name', text: '!' + translate('command') + ', ' + translate('keyword') + ' ' + translate('or') + ' g:' + translate('group') },
      { value: 'count', text: translate('cooldown') },
      { value: 'type', text: translate('cooldown') },
      {
        value: 'isEnabled', text: capitalize(translate('enabled')), align: 'center',
      },
      {
        value: 'isErrorMsgQuiet', text: capitalize(translate('quiet')), align: 'center',
      },
      {
        value: 'isOwnerAffected', text: capitalize(translate('core.permissions.casters')), align: 'center',
      },
      {
        value: 'isModeratorAffected', text: capitalize(translate('core.permissions.moderators')), align: 'center',
      },
      {
        value: 'isSubscriberAffected', text: capitalize(translate('core.permissions.subscribers')), align: 'center',
      },
      {
        value: 'isFollowerAffected', text: capitalize(translate('core.permissions.followers')), align: 'center',
      },
    ];

    const headersDelete = [
      { value: 'name', text: '' },
    ];

    onMounted(() => {
      refresh();
    });

    const refresh = () => {
      getSocket('/systems/cooldown').emit('generic::getAll', (err: string | null, itemsGetAll: CooldownInterfaceUI[]) => {
        if (err) {
          return error(err);
        }
        console.debug('Loaded', itemsGetAll);
        items.value = itemsGetAll;
        for (const item of items.value) {
          item.count = item.miliseconds / 1000;
        }
        // we also need to reset selection values
        if (selected.value.length > 0) {
          selected.value.forEach((selectedItem, index) => {
            selectedItem = items.value.find(o => o.id === selectedItem.id) || selectedItem;
            selected.value[index] = selectedItem;
          });
        }
        state.value.loading = ButtonStates.success;
      });
    };
    const batchUpdate = (value: Record<string, any>) => {
      // check validity
      for (const toUpdate of selected.value) {
        const item = items.value.find(o => o.id === toUpdate.id);
        if (!item) {
          continue;
        }

        for (const key of Object.keys(rules)) {
          for (const rule of (rules as any)[key]) {
            const ruleStatus = rule((toUpdate as any)[key]);
            if (ruleStatus === true) {
              continue;
            } else {
              EventBus.$emit('snack', 'red', `[${key}] - ${ruleStatus}`);
              return;
            }
          }
        }

        for (const key of Object.keys(value)) {
          if (typeof value[key] !== 'undefined') {
            (item as any)[key] = value[key];
          }
        }

        console.log('Updating', { item });

        getSocket('/systems/cooldown').emit('cooldown::save', item, () => {
          EventBus.$emit('snack', 'success', 'Data updated.');
          refresh();
        });
      }
    };

    const deleteSelected = async () => {
      deleteDialog.value = false;
      await Promise.all(
        selected.value.map((item) => {
          return new Promise((resolve, reject) => {
            getSocket('/systems/cooldown').emit('generic::deleteById', item.id, (err: string | null) => {
              if (err) {
                reject(error(err));
              }
              resolve(true);
            });
          });
        }),
      );
      refresh();

      EventBus.$emit('snack', 'success', 'Data removed.');
      selected.value = [];
    };

    return {
      saveCurrentItems,
      items,
      search,
      state,
      headers,
      headersDelete,
      selected,
      deleteSelected,
      batchUpdate,
      selectable,
      deleteDialog,
      translate,
      timestamp,
      rules,
      typeItems,
      mdiMagnify,
      mdiCheckboxMultipleMarkedOutline,
      ButtonStates,
      refresh,
    };
  },
});
</script>
