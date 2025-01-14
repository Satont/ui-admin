<template>
  <v-container fluid :class="{ 'pa-4': !$vuetify.breakpoint.mobile }">
    <v-alert
      v-if="!$store.state.$systems.find(o => o.name === 'songs').enabled"
      color="error"
      class="mb-0"
    >
      {{ translate('this-system-is-disabled') }}
    </v-alert>

    <v-data-table
      v-model="selected"
      :expanded.sync="expanded"
      calculate-widths
      hide-default-header
      :show-select="selectable"
      :loading="state.loading !== ButtonStates.success"
      :headers="headers"
      :items-per-page.sync="perPage"
      :items="fItems"
      :single-expand="true"
      show-expand
      item-key="videoId"
      @current-items="saveCurrentItems"
      :page.sync="currentPage"
      :server-items-length.sync="count"
      @click:row="addToSelectedItem"
    >
      <template #top>
        <v-sheet
          flat
          color="dark"
          class="my-2 pb-2 mt-0"
        >
          <v-row class="px-2" no-gutters>
            <v-col cols="auto" align-self="center" class="pr-2">
              <v-btn icon :color="selectable ? 'primary' : 'secondary'" @click="selectable = !selectable">
                <v-icon>
                  {{ mdiCheckboxMultipleMarkedOutline }}
                </v-icon>
              </v-btn>
            </v-col>
            <v-col align-self="center">
              <v-text-field
                v-model="search"
                :append-icon="mdiMagnify"
                label="Search or add by link/id"
                single-line
                hide-details
                class="pa-0 ma-2"
              />
            </v-col>
            <v-col cols="auto" align-self="center">
              <template v-if="selected.length > 0">
                <v-dialog
                  v-model="deleteDialog"
                  max-width="500px"
                >
                  <template #activator="{ on, attrs }">
                    <v-btn
                      color="error"
                      class="mr-1"
                      v-bind="attrs"
                      v-on="on"
                    >
                      Delete {{ selected.length }} Item(s)
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
              </template>

              <v-btn
                color="primary"
                :disabled="search.length === 0"
                :loading="state.import === 1"
                @click="addSongOrPlaylist"
              >
                New Item
              </v-btn>
            </v-col>
          </v-row>
        </v-sheet>
      </template>

      <template #[`body.prepend`]="{}">
        <tr>
          <td colspan="4" />
          <td>
            <v-select
              v-model="showTag"
              :items="tagsItems"
              clearable
            />
          </td>
          <td colspan="2" />
        </tr>
      </template>

      <template #[`item.title`]="{ item }">
        <div>
          {{ item.title }}
        </div>
        <div>
          <v-icon>{{ mdiClockOutline }}</v-icon> {{ item.length | formatTime }}
          <v-icon>{{ mdiVolumeHigh }}</v-icon> {{ Number(item.volume).toFixed(1) }}%
          <v-icon>{{ mdiSkipPrevious }}</v-icon> {{ item.startTime | formatTime }} - {{ item.endTime | formatTime }} <v-icon>{{ mdiSkipNext }}</v-icon>
          <v-icon>{{ mdiMusic }}</v-icon> {{ dayjs(item.lastPlayedAt).format('LL') }} {{ dayjs(item.lastPlayedAt).format('LTS') }}
        </div>
      </template>

      <template #[`item.tags`]="{ item }">
        <v-chip-group class="d-inline-block">
          <v-chip
            v-for="tag of item.tags"
            :key="tag"
            x-small
            @click="showTag=tag"
          >
            {{ tag }}
          </v-chip>
        </v-chip-group>
      </template>

      <template #[`item.thumbnail`]="{ item }">
        <v-img
          :aspect-ratio="16/9"
          :width="100"
          :src="generateThumbnail(item.videoId)"
        />
      </template>
      <template #[`item.actions`]="{ item }">
        <v-hover v-slot="{ hover }">
          <v-btn
            icon
            :color="hover ? 'primary' : 'secondary lighten-3'"
            :href="'http://youtu.be/' + item.videoId"
            target="_blank"
          >
            <v-icon>
              {{ mdiLink }}
            </v-icon>
          </v-btn>
        </v-hover>
      </template>

      <template #expanded-item="{ headers, item }">
        <td
          :colspan="headers.length"
          class="pa-2"
        >
          <v-row>
            <v-col cols="auto">
              <v-btn-toggle
                v-model="item.forceVolume"
              >
                <v-btn :value="false">
                  {{ translate('systems.songs.calculated') }}
                </v-btn>
                <v-btn :value="true">
                  {{ translate('systems.songs.set_manually') }}
                </v-btn>
              </v-btn-toggle>
            </v-col>
            <v-col>
              <v-text-field
                v-model.number="item.volume"
                :label="translate('systems.songs.settings.volume')"
                min="0"
                max="100"
                type="number"
                :rules="rules.volume"
                :disabled="!item.forceVolume"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-text-field
                v-model.number="item.startTime"
                :label="translate('systems.songs.startTime')"
                min="0"
                :max="Number(item.endTime) - 1"
                type="number"
                :rules="rules.time"
              >
                <template #append>
                  {{ translate('systems.songs.seconds') }}
                </template>
              </v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                v-model.number="item.endTime"
                :label="translate('systems.songs.endTime')"
                :min="Number(item.startTime) + 1"
                :max="item.length"
                type="number"
                :rules="rules.time"
              >
                <template #append>
                  {{ translate('systems.songs.seconds') }}
                </template>
              </v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-combobox
                v-model="item.tags"
                :label="translate('tags')"
                multiple
                :return-object="false"
                :items="tagsItemsWithoutNull"
                @input="ensureGeneralTag(item)"
              >
                <template #no-data>
                  <v-list-item>
                    <span class="subheading">Add new tag</span>
                  </v-list-item>
                </template>
              </v-combobox>
            </v-col>
          </v-row>

          <v-btn
            color="primary"
            :loading="state.save !== 0"
            @click="updateItem(item.videoId)"
          >
            Save
          </v-btn>
        </td>
      </template>
    </v-data-table>
  </v-container>
</template>

<script lang="ts">
import {
  mdiCheckboxMultipleMarkedOutline, mdiClockOutline, mdiLink, mdiMagnify, mdiMusic, mdiSkipNext, mdiSkipPrevious, mdiVolumeHigh,
} from '@mdi/js';
import {
  computed, defineComponent, onMounted, ref, watch,
} from '@nuxtjs/composition-api';
import { ButtonStates } from '@sogebot/ui-helpers/buttonStates';
import { dayjs } from '@sogebot/ui-helpers/dayjsHelper';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';

import type { SongPlaylistInterface } from '.bot/src/database/entity/song';
import { addToSelectedItem } from '~/functions/addToSelectedItem';
import { error } from '~/functions/error';
import { EventBus } from '~/functions/event-bus';
import {
  maxValue, minValue, required,
} from '~/functions/validators';

export default defineComponent({
  filters: {
    formatTime (seconds: number) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return [
        h,
        m > 9 ? m : (h ? '0' + m : m || '0'),
        s > 9 ? s : '0' + s,
      ].filter(a => a).join(':');
    },
  },
  setup () {
    const items = ref([] as SongPlaylistInterface[]);
    const search = ref('');

    const deleteDialog = ref(false);
    const selected = ref([] as SongPlaylistInterface[]);
    const currentItems = ref([] as SongPlaylistInterface[]);
    const saveCurrentItems = (value: SongPlaylistInterface[]) => {
      currentItems.value = value;
    };
    const expanded = ref([] as SongPlaylistInterface[]);
    const selectable = ref(false);
    watch(selectable, (val) => {
      if (!val) {
        selected.value = [];
      }
    });

    const state = ref({
      loading: ButtonStates.progress,
      import:  ButtonStates.idle,
      save:    ButtonStates.idle,
    } as {
      loading: number;
      import: number;
      save: number;
    });
    const showTag = ref(null as string | null); // null === all
    const currentTag = ref('general');
    const tags = ref([] as string[]);
    const tagsItems = computed(() => {
      return [{ text: 'All playlists', value: null }, ...tags.value.map(item => ({
        text:     currentTag.value === item ? `${item} (current)` : item,
        value:    item,
        disabled: false,
      }))];
    });
    const tagsItemsWithoutNull = computed(() => {
      const [, ...rest] = tagsItems.value;
      return rest;
    });

    const rules = {
      time:   [required],
      volume: [required, minValue(0), maxValue(100)],
    };

    const headers = [
      {
        value: 'thumbnail', text: '', align: 'left',
      },
      { value: 'videoId', text: '' },
      { value: 'title', text: '' },
      { value: 'tags', text: '' },
      {
        text: 'Actions', value: 'actions', sortable: false, align: 'end',
      },
      { text: '', value: 'data-table-expand' },
    ];

    const headersDelete = [
      { value: 'videoId', text: '' },
      { value: 'title', text: '' },
    ];

    const currentPage = ref(1);
    const count = ref(0);
    const perPage = ref(15);
    const fItems = computed(() => items.value);

    onMounted(() => {
      refresh();
    });

    watch(showTag, () => {
      currentPage.value = 1;
      refresh();
    });

    watch([currentPage, search, perPage], () => {
      refresh();
    });

    const refresh = async () => {
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          getSocket('/systems/songs').emit('current.playlist.tag', (err: string | null, tag: string) => {
            if (err) {
              error(err);
              reject(err);
            }
            currentTag.value = tag;
            resolve();
          });
        }),
        new Promise<void>((resolve, reject) => {
          getSocket('/systems/songs').emit('get.playlist.tags', (err: string | null, _tags: string[]) => {
            if (err) {
              error(err);
              reject(err);
            }
            tags.value = [..._tags];
            resolve();
          });
        }),
        new Promise<void>((resolve, reject) => {
          getSocket('/systems/songs').emit('find.playlist', {
            page: (currentPage.value - 1), search: search.value, tag: showTag.value, perPage: perPage.value,
          }, (err: string | null, _items: SongPlaylistInterface[], _count: number) => {
            if (err) {
              error(err);
              reject(err);
            }
            for (const item of _items) {
              item.startTime = item.startTime ? item.startTime : 0;
              item.endTime = item.endTime ? item.endTime : item.length;
            }
            count.value = _count;
            items.value = _items;
            resolve();
          });
        }),
      ]);
      state.value.loading = ButtonStates.success;
      if (showTag.value && !tags.value.includes(showTag.value)) {
        showTag.value = null;
      }
    };

    const generateThumbnail = (videoId: string) => {
      return `https://img.youtube.com/vi/${videoId}/1.jpg`;
    };

    const addSongOrPlaylist = () => {
      if (search.value === '') {
        EventBus.$emit('snack', 'red', 'Cannot add empty song to ban list.');
        return;
      }
      if (state.value.import === 0) {
        state.value.import = 1;
        getSocket('/systems/songs').emit(search.value.includes('playlist') ? 'import.playlist' : 'import.video', { playlist: search.value, forcedTag: showTag.value }, (err: string | null) => {
          if (err) {
            search.value = '';
            state.value.import = 0;
            return error(err);
          } else {
            state.value.import = 0;
            refresh();
            search.value = '';
            EventBus.$emit('snack', 'success', 'Song added to playlist.');
          }
        });
      }
    };

    const updateItem = (videoId: string) => {
      state.value.save = 1;

      const item = items.value.find(o => o.videoId === videoId);
      if (item) {
        item.volume = Number(item.volume);
        item.startTime = Number(item.startTime);
        item.endTime = Number(item.endTime);
        getSocket('/systems/songs').emit('songs::save', item, (err: string | null) => {
          if (err) {
            console.error(err);
            state.value.save = 3;
            return;
          }
          state.value.save = 2;
          refresh();
          setTimeout(() => {
            state.value.save = 0;
          }, 1000);
        });
      }
    };

    const deleteSelected = async () => {
      deleteDialog.value = false;
      await Promise.all(
        selected.value.map((item) => {
          return new Promise((resolve, reject) => {
            getSocket('/systems/songs').emit('delete.playlist', item.videoId, (err: string | null) => {
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

    const ensureGeneralTag = (item: SongPlaylistInterface) => {
      if (item.tags.length === 0) {
        item.tags = ['general'];
      }
    };

    return {
      addToSelectedItem: addToSelectedItem(selected, 'videoId', currentItems),
      items,
      fItems,
      headers,
      headersDelete,
      search,
      state,
      showTag,
      currentTag,
      tagsItems,
      tagsItemsWithoutNull,
      tags,
      perPage,
      currentPage,
      count,
      selectable,
      saveCurrentItems,

      generateThumbnail,
      addSongOrPlaylist,
      updateItem,

      ButtonStates,
      translate,

      dayjs,
      deleteDialog,
      deleteSelected,
      selected,
      expanded,
      rules,
      ensureGeneralTag,
      mdiMagnify,
      mdiClockOutline,
      mdiVolumeHigh,
      mdiSkipPrevious,
      mdiSkipNext,
      mdiMusic,
      mdiLink,
      mdiCheckboxMultipleMarkedOutline,
    };
  },
});
</script>

<style>
.table-p-0 td {
  padding: 0 !important;
}

.fitThumbnail {
  width: 100px;
}
</style>
