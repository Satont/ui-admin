<template>
  <loading v-if="!settings" />
  <v-form v-else v-model="valid" lazy-validation>
    <v-tabs v-model="tab">
      <v-tab>{{ translate('categories.keys') }}</v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab">
      <v-tab-item eager>
        <v-data-table :headers="privateKeysHeaders" :loading="loading" :items="privateKeys" sort-by="createdAt" :sort-desc="true">
          <template #[`item.createdAt`]="{ item }">
            {{ new Date(item.createdAt).toLocaleString() }}
          </template>
          <template #[`item.actions`]="{ item }">
            <v-btn icon @click="removePrivateKeyById(item.id)">
              <v-icon color="red">mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>

        <div class="text-center ma-auto">
          <form
            enctype="multipart/form-data"
            novalidate
          >
            <v-btn
              color="primary"
              :loading="uploading === ButtonStates.progress"
              @click="$refs.uploadFileInput.click()"
            >
              Upload new key
            </v-btn>
            <input
              ref="uploadFileInput"
              class="d-none input-file"
              type="file"
              :disabled="uploading === ButtonStates.progress"
              multiple
              accept="application/json"
              @change="filesChange($event.target.files)"
            >
          </form>
        </div>
      </v-tab-item>
    </v-tabs-items>
  </v-form>
</template>

<script lang="ts">
import { useStore } from '@nuxtjs/composition-api';
import { ButtonStates } from '@sogebot/ui-helpers/buttonStates';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  useMutation,
  useQuery, useResult,
} from '@vue/apollo-composable';
import {
  defineComponent, nextTick, onMounted, ref, watch,
} from '@vue/composition-api';
import { cloneDeep } from 'lodash';
import { v4 } from 'uuid';

import { error } from '~/functions/error';
import { getBase64FromUrl } from '~/functions/getBase64FromURL';
import { saveSettings } from '~/functions/settings';
import DELETE_PRIVATE_KEYS from '~/queries/google/privateKeysDelete.gql';
import GET_ALL_PRIVATE_KEYS from '~/queries/google/privateKeysGetAll.gql';
import UPLOAD_PRIVATE_KEYS from '~/queries/google/privateKeysUpload.gql';

export default defineComponent({
  setup () {
    const privateKeys = ref([] as any[]);
    const { result, loading, refetch } = useQuery(GET_ALL_PRIVATE_KEYS);
    const cache = useResult<{privateKeys:any[] }, any[], any[]>(result, [], data => data.privateKeys);
    watch(cache, (value) => {
      if (!value) {
        return;
      }
      privateKeys.value = cloneDeep([...value]);
    }, { immediate: true, deep: true });
    const privateKeysHeaders = [
      { value: 'id', text: 'ID' },
      { value: 'clientEmail', text: 'E-mail' },
      { value: 'createdAt', text: 'Created at' },
      { value: 'actions', text: '' },
    ];
    const { mutate: updateMutation, onError: onErrorUpdate } = useMutation(UPLOAD_PRIVATE_KEYS);
    const { mutate: deleteMutation, onError: onErrorDelete } = useMutation(DELETE_PRIVATE_KEYS);
    onErrorUpdate(error);
    onErrorDelete(error);

    const settings = ref(null as Record<string, any> | null);
    const ui = ref(null as Record<string, any> | null);
    const store = useStore<any>();
    const valid = ref(true);
    const tab = ref(null);
    const uploading = ref(ButtonStates.idle as number);

    watch(settings, () => {
      store.commit('settings/pending', true);
    }, { deep: true });

    watch(() => store.state.settings.save, async (val) => {
      if (val && settings.value) {
        saveSettings('/services/google', store, settings.value);

        // upload privateKeys
        for (const key of privateKeys.value) {
          if (key.privateKey) {
            // if contain private key, we must save it do db
            await updateMutation({
              data_json: JSON.stringify({
                id:          key.id,
                clientEmail: key.clientEmail,
                privateKey:  key.privateKey,
                createdAt:   key.createdAt,
              }),
            });
          }
        }

        // go through private keys vs cache to delete keys
        for (const key of cache.value) {
          if (!privateKeys.value.find(o => o.id === key.id)) {
            await deleteMutation({ id: key.id });
          }
        }
        refetch();
      }
    });

    watch(valid, (val) => {
      store.commit('settings/valid', val);
    }, { immediate: true });

    onMounted(() => {
      getSocket(`/services/google`)
        .emit('settings', (err: string | null, _settings: { [x: string]: any }, _ui: { [x: string]: { [attr: string]: any } }) => {
          if (err) {
            console.error(err);
            return;
          }
          ui.value = _ui;
          settings.value = _settings;
          nextTick(() => { store.commit('settings/pending', false); });
        });
    });

    const filesChange = async (filesUpload: HTMLInputElement['files']) => {
      if (!filesUpload) {
        return;
      }
      uploading.value = ButtonStates.progress;

      for (const file of filesUpload) {
        try {
          const base64 = (await getBase64FromUrl(URL.createObjectURL(file))).split(',')[1];
          const text = JSON.parse(atob(base64));
          if (!text.client_email || !text.private_key) {
            throw new Error(`Invalid JSON file ${file.name}.`);
          }
          privateKeys.value = [{
            id:          v4(),
            clientEmail: text.client_email,
            privateKey:  text.private_key,
            createdAt:   new Date().toISOString(),
          }, ...privateKeys.value];
          store.commit('settings/pending', true);
        } catch (e) {
          console.error(e);
          error(e.message);
        }
      }
      uploading.value = ButtonStates.idle;
    };

    const removePrivateKeyById = (id: string) => {
      privateKeys.value = privateKeys.value.filter(o => o.id !== id);
      store.commit('settings/pending', true);
    };

    return {
      settings,
      ui,
      translate,
      valid,
      tab,

      privateKeys,
      privateKeysHeaders,
      removePrivateKeyById,
      loading,
      uploading,
      filesChange,

      ButtonStates,
    };
  },
});
</script>
