<template>
  <v-dialog
    v-model="dialog"
    transition="dialog-bottom-transition"
    fullscreen
    persistent
    hide-overlay
    large
  >
    <template #activator="{ on, attrs }">
      <div
        v-bind="attrs"
        v-on="on"
      >
        <span
          v-if="responsesUpdated.length === 0"
          class="text--lighten-1  red--text"
        >{{ translate('systems.customcommands.no-responses-set') }}</span>
        <template v-for="(r, i) of responsesUpdated">
          <div
            :key="i"
          >
            <v-divider
              v-if="i > 0"
              class="ma-2"
            />
            <v-row>
              <v-col
                cols="auto"
                class="caption"
                style="line-height: 2.5rem;"
              >
                {{ translate('response') }}#{{ i + 1 }}
              </v-col>
              <v-col
                cols="auto"
                class="caption"
                style="line-height: 2.5rem;"
              >
                <v-icon>{{ mdiKey }}</v-icon>
                {{ getPermissionName(r.permission, permissions) }}
              </v-col>
              <v-col
                cols="auto"
                class="caption"
                style="line-height: 2.5rem;"
              >
                <v-icon v-if="r.stopIfExecuted">
                  {{ mdiPause }}
                </v-icon>
                <v-icon v-else>
                  {{ mdiPlay }}
                </v-icon>
                {{ r.stopIfExecuted ? translate('commons.stop-if-executed') : translate('commons.continue-if-executed') }}
              </v-col>
              <v-col
                v-if="r.filter.length > 0"
                cols="auto"
                class="caption"
                style="line-height: 2.5rem;"
              >
                <v-icon>
                  {{ mdiFilter }}
                </v-icon>
                <text-with-tags
                  class="d-inline-block"
                  :value="r.filter"
                />
              </v-col>
            </v-row>
            <text-with-tags :value="r.response" />
          </div>
        </template>
      </div>
    </template>

    <v-card>
      <v-card-title class="headline">
        Update <code class="mx-2">{{ name }}</code> {{ translate('response').toLowerCase() }}
      </v-card-title>

      <v-card-text>
        <draggable
          v-model="responsesUpdated"
          draggable=".item"
          handle=".handle"
        >
          <v-list-item
            v-for="(r, i) of responsesUpdated"
            :key="'response' + i"
            class="item"
          >
            <v-list-item-content>
              <v-row>
                <v-col
                  cols="12"
                  md="8"
                >
                  <v-lazy>
                    <v-textarea
                      v-model="responsesUpdated[i].response"
                      hide-details="auto"
                      :label="translate('response') + '#' + (i + 1)"
                      :rows="1"
                      counter
                      auto-grow
                      :autofocus="i === 0"
                      @keydown.enter.prevent
                    >
                      <template #prepend>
                        <v-icon class="handle">
                          {{ mdiDrag }}
                        </v-icon>
                      </template>
                      <template #append>
                        <input-variables
                          :filters="['sender', 'param', '!param', 'touser']"
                          @input="responsesUpdated[i].response = responsesUpdated[i].response + $event"
                        />
                      </template>
                      <template #append-outer>
                        <input-permissions
                          :permissions="permissions"
                          :permission="responsesUpdated[i].permission"
                          @input="responsesUpdated[i].permission = $event"
                          nullable
                        />
                        <v-btn
                          small
                          plain
                          @click="responsesUpdated[i].stopIfExecuted = !responsesUpdated[i].stopIfExecuted"
                        >
                          {{ responsesUpdated[i].stopIfExecuted ? translate('commons.stop-if-executed') : translate('commons.continue-if-executed') }}
                        </v-btn>
                      </template>
                    </v-textarea>
                  </v-lazy>
                </v-col>
                <v-col
                  cols="12"
                  md="4"
                >
                  <v-lazy>
                    <v-textarea
                      v-model="responsesUpdated[i].filter"
                      hide-details="auto"
                      :label="capitalize(translate('systems.customcommands.filter.name'))"
                      :rows="1"
                      counter
                      auto-grow
                      @keydown.enter.prevent
                    >
                      <template #append>
                        <input-variables
                          :filters="['sender', 'source', 'param', 'haveParam', 'is.newchatter', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'rank', 'game', 'language', 'title', 'views', 'followers', 'subscribers', 'isBotSubscriber']"
                          @input="responsesUpdated[i].filter = responsesUpdated[i].filter + $event"
                        />
                      </template>
                      <template #append-outer>
                        <v-btn
                          icon
                          @click="remove(i)"
                        >
                          <v-icon>{{ mdiTrashCan }}</v-icon>
                        </v-btn>
                      </template>
                    </v-textarea>
                  </v-lazy>
                </v-col>
              </v-row>
            </v-list-item-content>
          </v-list-item>
        </draggable>
      </v-card-text>

      <v-card-actions>
        <v-btn @click="responsesUpdated.push({ filter: '', order: responsesUpdated.length, response: '', stopIfExecuted: false, permission: orderBy(permissions, 'order', 'asc').pop().id })">
          {{ translate('systems.customcommands.addResponse') }}
        </v-btn>
        <v-spacer />
        <v-btn
          color="blue darken-1"
          text
          @click="close"
        >
          Close
        </v-btn>
        <v-btn
          color="blue darken-1"
          text
          @click="save"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {
  mdiDrag, mdiFilter, mdiKey, mdiPause, mdiPlay, mdiTrashCan,
} from '@mdi/js';
import {
  defineAsyncComponent, defineComponent, ref, watch,
} from '@nuxtjs/composition-api';
import translate from '@sogebot/ui-helpers/translate';
import {
  capitalize, cloneDeep, orderBy,
} from 'lodash';
import draggable from 'vuedraggable';

import { getPermissionName } from '~/functions/getPermissionName';

export default defineComponent({
  components: {
    draggable,
    'input-variables':   defineAsyncComponent({ loader: () => import('~/components/inputVariables.vue') }),
    'input-permissions': defineAsyncComponent({ loader: () => import('~/components/inputPermissions.vue') }),
    'text-with-tags':    defineAsyncComponent({ loader: () => import('~/components/textWithTags.vue') }),
  },
  props: {
    responses: Array, name: String, permissions: Array,
  },
  setup (props, ctx) {
    let responsesBackup: any[] = [];
    const responsesUpdated = ref(cloneDeep(props.responses ?? []));
    const dialog = ref(false);

    watch(dialog, (val) => {
      if (val) {
        responsesBackup = cloneDeep(props.responses ?? []);
      }
    });

    const save = () => {
      ctx.emit('save', responsesUpdated.value);
      dialog.value = false;
    };

    const close = () => {
      ctx.emit('close');
      responsesUpdated.value = responsesBackup; // revert
      dialog.value = false;
    };

    const remove = (idx: number) => {
      responsesUpdated.value.splice(idx, 1);
    };

    return {
      orderBy,
      translate,
      dialog,
      capitalize,
      close,
      save,
      remove,
      responsesUpdated,
      getPermissionName,

      mdiPause,
      mdiPlay,
      mdiFilter,
      mdiDrag,
      mdiKey,
      mdiTrashCan,
    };
  },
});
</script>
