<template>
  <v-expansion-panels v-model="model">
    <slot/>
    <v-expansion-panel :readonly="typeof $slots.default === 'undefined'">
      <v-expansion-panel-header>Settings</v-expansion-panel-header>
      <v-expansion-panel-content>
        <v-row>
          <v-col cols="auto">
            <label class="v-label theme--dark" style="position: relative; top: 5px;">
              {{ translate('overlays.emotes.settings.cEmotesSize') }}
            </label>
          </v-col>
          <v-col>
            <v-slider
              v-model="options.emotesSize"
              :title="translate('overlays.emotes.settings.cEmotesSize')"
              min="1"
              max="3"
              :tick-labels="[1, 2, 3]"
              ticks="always"
              tick-size="4"
            />
          </v-col>
        </v-row>
        <v-select
          v-model="options.animation"
          :items="['fadeup', 'fadezoom', 'facebook']"
          :label="translate('overlays.emotes.settings.cEmotesAnimation')"
        />
        <v-text-field
          v-model.number="options.maxEmotesPerMessage"
          :label="translate('overlays.emotes.settings.cEmotesMaxEmotesPerMessage')"
          min="1"
        />
        <v-text-field
          v-model.number="options.animationTime"
          :label="translate('overlays.emotes.settings.cEmotesAnimationTime')"
          min="200"
        />
        <v-btn @click="test">
          {{ translate('overlays.emotes.settings.btnTestEmote') }}
        </v-btn>
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script lang="ts">
import {
  defineComponent, ref, watch,
} from '@nuxtjs/composition-api';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  defaults, isEqual, pick,
} from 'lodash';

export default defineComponent({
  props: { value: [Object, Array] },
  setup (props: any, ctx) {
    const model = ref(0);
    const options = ref(
      pick(
        defaults(Array.isArray(props.value) ? null : props.value, {
          emotesSize:          3,
          animation:           'fadeup',
          animationTime:       1000,
          maxEmotesPerMessage: 5,
        }),
        ['emotesSize', 'animation', 'animationTime', 'maxEmotesPerMessage']));

    watch(options, (val: any) => {
      if (!isEqual(props.value, options.value)) {
        ctx.emit('input', val);
      }
    }, { deep: true, immediate: true });

    const test = () => {
      getSocket('/core/emotes').emit('test', () => {
        return true;
      });
    };

    return {
      model,
      options,
      translate,
      test,
    };
  },
});
</script>
