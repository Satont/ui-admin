<template>
  <v-snackbars :objects.sync="snacks">
    <template #default="{ message }">
      <div v-html="message" />
    </template>
  </v-snackbars>
</template>

<script lang="ts">
import {
  defineComponent,
  onMounted,
  ref,
} from '@nuxtjs/composition-api';
import VSnackbars from 'v-snackbars';

import { EventBus } from '../functions/event-bus';

export default defineComponent({
  components: { 'v-snackbars': VSnackbars },
  setup () {
    const snacks = ref([] as {
      timeout: number,
      color: string,
      message: string,
    } []);

    onMounted(() => {
      EventBus.$on('snack', (color: string, message: string) => {
        if (!snacks.value.find(item => item.color === color && item.message === message)) {
          snacks.value.push({
            color,
            message,
            timeout: 5000,
          });
        }
      });
    });

    return { snacks };
  },
});
</script>
