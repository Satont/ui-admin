<template>
  <span>
    <v-textarea
      :value="options.allowedIPs.join('\n')"
      rows="5"
      :label="translate('registry.overlays.allowedIPs.name')"
      :hint="translate('registry.overlays.allowedIPs.help')"
      persistent-hint
      @input="options.allowedIPs = $event.split('\n')"
    />
    <v-btn @click="addCurrentIP(options.allowedIPs)">Add current IP</v-btn>
  </span>
</template>

<script lang="ts">
import {
  defineComponent, ref, watch,
} from '@nuxtjs/composition-api';
import { getCurrentIP } from '@sogebot/ui-helpers/getCurrentIP';
import translate from '@sogebot/ui-helpers/translate';
import {
  defaults, isEqual, pick,
} from 'lodash';

export default defineComponent({
  props: { value: [Object, Array] },
  setup (props, ctx) {
    const options = ref(
      pick(
        defaults(Array.isArray(props.value) ? null : props.value, { allowedIPs: [] }),
        ['allowedIPs'],
      ));

    watch(options, (val) => {
      if (!isEqual(props.value, options.value)) {
        ctx.emit('input', val);
      }
    }, { deep: true, immediate: true });

    const addCurrentIP = (array: string[]) => {
      getCurrentIP().then((value) => {
        if (array[array.length - 1] === '') {
          array[array.length - 1] = value;
        } else {
          array.push(value);
        }
      });
    };

    return {
      addCurrentIP,
      options,
      translate,
    };
  },
});
</script>
