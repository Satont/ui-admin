<template>
  <v-container fluid :class="{ 'pa-4': !$vuetify.breakpoint.mobile }">
    <v-alert
      v-if="!$store.state.$systems.find(o => o.name === 'quotes').enabled"
      color="error"
      class="mb-0"
    >
      {{ translate('this-system-is-disabled') }}
    </v-alert>

    <v-data-table
      v-model="selected"
      calculate-widths
      :show-select="selectable"
      :search="search"
      :loading="state.loading !== ButtonStates.success"
      :headers="headers"
      :items-per-page="-1"
      :items="fItems"
      @current-items="saveCurrentItems"
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
                label="Search"
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
              </template>

              <v-dialog
                v-model="newDialog"
                max-width="500px"
              >
                <template #activator="{ on, attrs }">
                  <v-btn
                    color="primary"
                    v-bind="attrs"
                    v-on="on"
                  >
                    New item
                  </v-btn>
                </template>

                <v-card>
                  <v-card-title>
                    <span class="headline">New item</span>
                  </v-card-title>

                  <v-card-text :key="timestamp">
                    <new-item
                      :rules="rules"
                      @close="newDialog = false"
                      @save="saveSuccess"
                    />
                  </v-card-text>
                </v-card>
              </v-dialog>
            </v-col>
          </v-row>
        </v-sheet>
      </template>

      <template #[`item.quote`]="{ item }">
        <v-edit-dialog
          persistent
          large
          :return-value.sync="item.quote"
          @save="update(item, false, 'quote')"
        >
          {{ item.quote }}
          <template #input>
            <v-lazy>
              <v-textarea
                v-model="item.quote"
                hide-details="auto"
                :label="capitalize(translate('systems.quotes.quote.name'))"
                :rows="1"
                counter
                auto-grow
                @keydown.enter.prevent
              />
            </v-lazy>
          </template>
        </v-edit-dialog>
      </template>

      <template #[`item.createdAt`]="{ item }">
        {{ dayjs(item.createdAt).format('LL') }} {{ dayjs(item.createdAt).format('LTS') }}
      </template>

      <template #[`item.quotedByName`]="{ item }">
        <NuxtLink :to="'/manage/viewers/' + item.quotedBy">
          {{ item.quotedByName }}&nbsp;<small>{{ item.quotedBy }}</small>
        </NuxtLink>
      </template>

      <template #[`item.tags`]="{ item }">
        <v-row
          no-gutters
          dense
        >
          <v-col cols="auto">
            <v-chip-group>
              <v-chip
                v-for="tag of item.tags"
                :key="tag"
                x-small
                @click.stop="showTag=tag"
              >
                {{ tag }}
              </v-chip>
            </v-chip-group>
          </v-col>
          <v-col cols="auto">
            <v-edit-dialog
              persistent
              large
              :return-value.sync="item.tags"
              @save="update(item, false, 'tags')"
            >
              <v-icon
                small
                class="pa-2"
                @click="tagsSearch = ''"
              >
                {{ mdiTagPlus }}
              </v-icon>
              <template #input>
                <v-combobox
                  v-model="item.tags"
                  hide-selected
                  small-chips
                  clearable
                  :search-input.sync="tagsSearch"
                  :return-object="false"
                  multiple
                  dense
                  :items="tagsItemsWithoutNull"
                >
                  <template #no-data>
                    <v-list-item>
                      <span class="subheading">Add new tag</span>
                      <strong class="pl-2">{{ tagsSearch }}</strong>
                    </v-list-item>
                  </template>
                </v-combobox>
              </template>
            </v-edit-dialog>
          </v-col>
        </v-row>
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
    </v-data-table>
  </v-container>
</template>

<script lang="ts">
import {
  mdiCheckboxMultipleMarkedOutline, mdiMagnify, mdiTagPlus,
} from '@mdi/js';
import {
  computed, defineAsyncComponent, defineComponent, onMounted, ref, watch,
} from '@nuxtjs/composition-api';
import { ButtonStates } from '@sogebot/ui-helpers/buttonStates';
import { dayjs } from '@sogebot/ui-helpers/dayjsHelper';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  capitalize, flatten, orderBy, uniq,
} from 'lodash';

import type { QuotesInterface } from '.bot/src/database/entity/quotes';
import { addToSelectedItem } from '~/functions/addToSelectedItem';
import { error } from '~/functions/error';
import { EventBus } from '~/functions/event-bus';
import { required } from '~/functions/validators';

export default defineComponent({
  components: { 'new-item': defineAsyncComponent({ loader: () => import('~/components/new-item/quotes-newItem.vue') }) },
  setup () {
    const timestamp = ref(Date.now());

    const selected = ref([] as QuotesInterface[]);
    const currentItems = ref([] as QuotesInterface[]);
    const saveCurrentItems = (value: QuotesInterface[]) => {
      currentItems.value = value;
    };
    const selectable = ref(false);
    watch(selectable, (val) => {
      if (!val) {
        selected.value = [];
      }
    });
    const deleteDialog = ref(false);
    const newDialog = ref(false);

    const saveSuccess = () => {
      refresh();
      EventBus.$emit('snack', 'success', 'Data updated.');
      newDialog.value = false;
    };

    const rules = { quote: [required] };

    const items = ref([] as QuotesInterface[]);
    const search = ref('');
    const showTag = ref(null as null | string);
    const tagsSearch = ref('');

    const headers = [
      {
        value: 'id', text: '', sortable: true,
      },
      {
        value: 'createdAt', text: translate('systems.quotes.date.name'), sortable: true,
      },
      {
        value: 'quote', text: translate('systems.quotes.quote.name'), sortable: true,
      },
      {
        value: 'tags', text: translate('systems.quotes.tags.name'), sortable: false,
      },
      {
        value: 'quotedByName', text: translate('systems.quotes.by.name'), sortable: true,
      },
    ];

    const headersDelete = [
      {
        value: 'quote', text: translate('systems.quotes.quote.name'), sortable: true,
      },
      {
        value: 'quotedByName', text: translate('systems.quotes.by.name'), sortable: true,
      },
    ];

    const state = ref({ loading: ButtonStates.progress } as {
      loading: number,
    });

    onMounted(() => {
      refresh();
    });

    const refresh = () => {
      getSocket('/systems/quotes').emit('quotes:getAll', {}, (err: string | null, data: QuotesInterface[]) => {
        if (err) {
          error(err);
          return;
        }
        items.value = data;
        state.value.loading = ButtonStates.success;
      });
    };

    const fItems = computed(() => {
      let quotesFilteredBySearch: QuotesInterface[] = [];
      if (search.value.trim().length > 0) {
        for (const quote of items.value) {
          if (quote.quote.toLowerCase().includes(search.value)) {
            quotesFilteredBySearch.push(quote);
          }
        }
      } else {
        quotesFilteredBySearch = items.value;
      }
      if (showTag.value === null) {
        return quotesFilteredBySearch;
      } else {
        const quotesFilteredByTags: QuotesInterface[] = [];
        for (const quote of quotesFilteredBySearch) {
          for (const tag of quote.tags) {
            if (showTag.value === tag) {
              quotesFilteredByTags.push(quote);
              break;
            }
          }
        }
        return quotesFilteredByTags;
      }
    });

    const tags = computed(() => {
      const _tags: string[][] = [];
      for (const quote of items.value) {
        _tags.push(quote.tags);
      }
      return orderBy(uniq(flatten(_tags)));
    });
    const tagsItems = computed(() => {
      return [{ text: 'Not filtered', value: null }, ...tags.value.map(item => ({
        text:     item,
        value:    item,
        disabled: false,
      }))];
    });
    const tagsItemsWithoutNull = computed(() => {
      const [, ...rest] = tagsItems.value;
      return rest;
    });

    const update = async (item: typeof items.value[number], multi = false, attr: keyof typeof items.value[number]) => {
      // check validity
      for (const key of Object.keys(rules)) {
        for (const rule of (rules as any)[key]) {
          const ruleStatus = rule((item as any)[key]);
          if (ruleStatus === true) {
            continue;
          } else {
            EventBus.$emit('snack', 'red', `[${key}] - ${ruleStatus}`);
            refresh();
            return;
          }
        }
      }

      // update all instantly
      for (const i of [item, ...(multi ? selected.value : [])]) {
        (i as any)[attr] = item[attr];
      }

      await Promise.all(
        [item, ...(multi ? selected.value : [])].map((itemToUpdate) => {
          return new Promise((resolve) => {
            console.log('Updating', { itemToUpdate }, { attr, value: item[attr] });
            getSocket('/systems/quotes').emit('generic::setById', {
              id:   itemToUpdate.id,
              item: {
                ...itemToUpdate,
                [attr]: item[attr], // save new value for all selected items
              },
            }, () => {
              resolve(true);
            });
          });
        }),
      );
      refresh();
      EventBus.$emit('snack', 'success', 'Data updated.');
    };

    const deleteSelected = async () => {
      deleteDialog.value = false;
      await Promise.all(
        selected.value.map((item) => {
          return new Promise((resolve, reject) => {
            getSocket('/systems/quotes').emit('generic::deleteById', item.id, (err: string | null) => {
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
      addToSelectedItem: addToSelectedItem(selected, 'id', currentItems),
      saveCurrentItems,
      items,
      fItems,
      tags,
      tagsItems,
      tagsItemsWithoutNull,
      headers,
      headersDelete,
      state,
      search,
      update,
      showTag,
      capitalize,
      tagsSearch,
      selectable,

      newDialog,
      deleteDialog,
      deleteSelected,
      selected,
      timestamp,
      saveSuccess,
      rules,

      dayjs,
      translate,
      mdiMagnify,
      mdiTagPlus,
      mdiCheckboxMultipleMarkedOutline,
      ButtonStates,
    };
  },
});
</script>
