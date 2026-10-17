import { ref } from 'vue';
import { enumsService } from '../services/api.js';

// Option lists for the form dropdowns, fetched once per list and kept for as long as the component lives
export function useEnumOptions() {
  const options = ref({});

  const load = async (enumTypes) => {
    await Promise.all(enumTypes.map(async (enumType) => {
      if (options.value[enumType]) return;
      try {
        const response = await enumsService.getValues(enumType);
        options.value[enumType] = response.data || [];
      } catch (error) {
        console.error(`Error loading ${enumType} options:`, error);
      }
    }));
  };

  return { options, load };
}
