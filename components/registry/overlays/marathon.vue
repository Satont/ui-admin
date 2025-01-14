<template>
  <div>
    <v-expansion-panels v-model="model" multiple>
      <v-expansion-panel>
        <v-expansion-panel-header>Settings</v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-text-field
            v-model="time"
            readonly
            class="pb-4"
            :persistent-hint="true"
            hint="To adjust time, use quickactions button"
            label="Time"
            hide-details="auto"
          />

          <v-switch
            v-model="maxEndTimeEnabled"
            label="Enable maximum end time"
            hide-details="auto"
          />
          <v-expand-transition>
            <datetime v-model="options.maxEndTime" v-if="options.maxEndTime !== null"/>
          </v-expand-transition>

          <v-switch v-model="options.showProgressGraph" label="Show progress graph" hide-details="auto" />
          <v-switch v-model="options.disableWhenReachedZero" label="Disable when reached zero" hide-details="auto" :persistent-hint="true" :hint="(options.disableWhenReachedZero ? 'Will disable adding new time when reached zero. Will reenable on manual time addition from quickactions.' : 'Time will be added even when reached zero.')" />
          <v-switch v-model="options.showMilliseconds" label="Show milliseconds" hide-details="auto" />
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-header>Time addition settings for subs, resubs, bits and tips</v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-row>
            <v-col cols="6">
              <v-subheader>Subscriptions</v-subheader>
              <v-text-field v-model="options.values.sub.tier1" hide-details="auto" label="Prime / Tier 1">
                <template #append>
                  seconds
                </template>
              </v-text-field>
              <v-text-field v-model="options.values.sub.tier2" hide-details="auto" label="Tier 2">
                <template #append>
                  seconds
                </template>
              </v-text-field>
              <v-text-field v-model="options.values.sub.tier3" hide-details="auto" label="Tier 3">
                <template #append>
                  seconds
                </template>
              </v-text-field>
              <v-subheader>Tips</v-subheader>
              <v-text-field v-model="options.values.tips.tips" hide-details="auto" label="Amount of donation">
                <template #append>
                  {{ currency }}
                </template>
              </v-text-field>
              <v-text-field v-model="options.values.tips.time" hide-details="auto" label="Time">
                <template #append>
                  seconds
                </template>
              </v-text-field>
              <v-switch
                v-model="options.values.tips.addFraction"
                label="Add fraction of tip"
                hide-details="auto"
                :persistent-hint="true"
                :hint="(options.values.tips.addFraction ? 'Will add even fractions of amount. E.g. if amount is set to 100 and you got 150, it will add 1.5x of time.' : 'Won\'t add fractions of amount. E.g. if amount is set to 100 and you got 150, it will add 1.0x of time.')"
              />
            </v-col>
            <v-col cols="6">
              <v-subheader>Resubscriptions</v-subheader>
              <v-text-field v-model="options.values.resub.tier1" hide-details="auto" label="Prime / Tier 1">
                <template #append>
                  seconds
                </template>
              </v-text-field>
              <v-text-field v-model="options.values.resub.tier2" hide-details="auto" label="Tier 2">
                <template #append>
                  seconds
                </template>
              </v-text-field>
              <v-text-field v-model="options.values.resub.tier3" hide-details="auto" label="Tier 3">
                <template #append>
                  seconds
                </template>
              </v-text-field>
              <v-subheader>Bits</v-subheader>
              <v-text-field v-model="options.values.bits.bits" hide-details="auto" label="Bits amount" />
              <v-text-field v-model="options.values.bits.time" hide-details="auto" label="Time">
                <template #append>
                  seconds
                </template>
              </v-text-field>
              <v-switch
                v-model="options.values.bits.addFraction"
                label="Add fraction of bits"
                hide-details="auto"
                :persistent-hint="true"
                :hint="(options.values.bits.addFraction ? 'Will add even fractions of amount. E.g. if amount is set to 100 and you got 150, it will add 1.5x of time.' : 'Won\'t add fractions of amount. E.g. if amount is set to 100 and you got 150, it will add 1.0x of time.')"
              />
            </v-col>
          </v-row>
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-header>Marathon font</v-expansion-panel-header>
        <v-expansion-panel-content>
          <font v-model="options.marathonFont" />
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineAsyncComponent,
  defineComponent, ref, useStore, watch,
} from '@nuxtjs/composition-api';
import {
  DAY, HOUR, MINUTE, SECOND,
} from '@sogebot/ui-helpers/constants';
import translate from '@sogebot/ui-helpers/translate';
import {
  defaultsDeep, isEqual, pick,
} from 'lodash';

export default defineComponent({
  components: {
    font:     defineAsyncComponent(() => import('~/components/form/expansion/font.vue')),
    datetime: defineAsyncComponent({ loader: () => import('~/components/datetime.vue') }),
  },
  props: { value: [Object, Array] },
  setup (props, ctx) {
    const store = useStore<any>();
    const currency = ref(store.state.configuration.currency);
    const model = ref([0]);
    const options = ref(
      pick(
        defaultsDeep(props.value, {
          showProgressGraph:      false,
          disableWhenReachedZero: true,
          endTime:                Date.now(),
          maxEndTime:             null,
          showMilliseconds:       false,
          values:                 {
            sub: {
              tier1: (10 * MINUTE) / SECOND,
              tier2: (15 * MINUTE) / SECOND,
              tier3: (20 * MINUTE) / SECOND,
            },
            resub: {
              tier1: (5 * MINUTE) / SECOND,
              tier2: (7.5 * MINUTE) / SECOND,
              tier3: (10 * MINUTE) / SECOND,
            },
            bits: {
              addFraction: true,
              bits:        100,
              time:        MINUTE / SECOND,
            },
            tips: {
              addFraction: true,
              tips:        1,
              time:        MINUTE / SECOND,
            },
          },
          marathonFont: {
            family:      'PT Sans',
            size:        50,
            borderPx:    1,
            borderColor: '#000000',
            weight:      '500',
            color:       '#ffffff',
            shadow:      [],
          },
        }),
        [
          'showProgressGraph', 'endTime', 'maxEndTime', 'showMilliseconds', 'values',
          'marathonFont', 'disableWhenReachedZero',
        ],
      ));

    const maxEndTimeEnabled = computed({
      get () {
        return options.value.maxEndTime !== null;
      },
      set (val: boolean) {
        if (val) {
          options.value.maxEndTime = Date.now() + DAY;
        } else {
          options.value.maxEndTime = null;
        }
      },
    });
    const time = computed(() => {
      const calculateTime = options.value.endTime - Date.now();

      if (calculateTime < 0) {
        return '0d 0h 0m 0s';
      }

      const days = Math.floor(calculateTime / DAY);
      const hours = Math.floor((calculateTime - days * DAY) / HOUR);
      const minutes = Math.floor((calculateTime - (days * DAY) - (hours * HOUR)) / MINUTE);
      const seconds = Math.floor((calculateTime - (days * DAY) - (hours * HOUR) - (minutes * MINUTE)) / SECOND);
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    });

    watch(options, (val) => {
      if (!isEqual(props.value, options.value)) {
        ctx.emit('input', val);
      }
    }, { deep: true, immediate: true });

    return {
      model,
      maxEndTimeEnabled,
      options,
      translate,
      time,
      currency,
    };
  },
});
</script>
