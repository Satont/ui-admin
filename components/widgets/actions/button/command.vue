<template>
  <v-card-text v-ripple class="text-button pa-1 mb-1 text-center" style="font-size: 12px !important; display: block;"
    :style="{ 'color': color }" @click="!editing ? trigger($event) : showDialog()">
    <v-row no-gutters>
      <v-slide-x-transition>
        <v-col v-if="editing" cols="auto" class="d-flex">
          <v-simple-checkbox v-if="color !== 'white'" v-model="selected" light />
          <v-simple-checkbox v-else v-model="selected" dark />
        </v-col>
      </v-slide-x-transition>
      <v-col class="text-truncate">
        {{ item.options.label }}
      </v-col>
    </v-row>
  </v-card-text>
</template>

<script lang="ts">
import { useMutation } from '@vue/apollo-composable';
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';
import gql from 'graphql-tag';

export default defineComponent({
  props: {
    item: Object, dialog: Boolean, color: String, editing: Boolean,
  },
  setup (props: {
    item: Record<string, any>,
    dialog: boolean,
    color: string,
    editing: boolean,
  }, ctx) {
    const { mutate: triggerMutation } = useMutation(gql`
      mutation quickActionTrigger($id: String!) {
        quickActionTrigger(id: $id)
      }`);
    const selected = ref(props.item.selected);
    watch(selected, (val) => {
      ctx.emit(val ? 'select' : 'unselect');
    });

    const showDialog = () => {
      ctx.emit('update:dialog', true);
    };

    const trigger = () => {
      if (props.item) {
        console.log(`quickaction::trigger::${props.item.id}`);
        triggerMutation({ id: props.item.id });
      }
    };

    return {
      // refs
      selected,

      // functions
      trigger,
      showDialog,
    };
  },
});
</script>
