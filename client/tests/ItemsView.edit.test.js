import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ItemsView from '../src/views/ItemsView.vue';
import { itemsService, categoriesService, locationsService } from '../src/services/api.js';

vi.mock('../src/services/api.js', () => ({
  itemsService: { getAll: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), updateQuantity: vi.fn() },
  categoriesService: { getAll: vi.fn() },
  locationsService: { getBoxes: vi.fn() },
  enumsService: { getValues: vi.fn() }
}));

const otherItem = {
  id: 'other-1',
  source_type: 'other_item',
  item_type: 'Cable',
  name: 'Micro Light Cable',
  display_name: 'Micro Light Cable',
  company: 'Noctua',
  display_company: 'Noctua',
  size: '2m',
  display_model: '2m',
  quantity: 5,
  box_id: 'box-1',
  category_id: 'cat-other',
  notes: 'spare'
};

async function openEditor() {
  const wrapper = mount(ItemsView, { props: { selectedCategory: 'cat-other' } });
  await flushPromises();
  await wrapper.get('tbody tr button[title="Edit"]').trigger('click');
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  itemsService.getAll.mockResolvedValue({ data: [otherItem] });
  itemsService.update.mockResolvedValue({ data: otherItem });
  categoriesService.getAll.mockResolvedValue({ data: [{ id: 'cat-other', name: 'Other Items' }] });
  locationsService.getBoxes.mockResolvedValue({ data: [{ id: 'box-1', storage_id: 'T01-B06', box_name: 'Big Box' }] });
});

describe('editing an Other Item', () => {
  it('selects the Other Items category and fills the type, name, size and company fields', async () => {
    const wrapper = await openEditor();
    expect(wrapper.get('.modal-form select').element.value).toBe('Other Items');
    const fields = wrapper.get('.other-items-fields');
    const values = fields.findAll('input').map((input) => input.element.value);
    expect(values).toEqual(['Cable', 'Micro Light Cable', '2m', 'Noctua']);
  });

  it('saves to the Other Items record with its specific type preserved', async () => {
    const wrapper = await openEditor();
    await wrapper.get('.other-items-fields input[placeholder^="e.g., XT90"]').setValue('Micro Light Cable v2');
    await wrapper.get('form.modal-form').trigger('submit');
    await flushPromises();
    expect(itemsService.update).toHaveBeenCalledTimes(1);
    const [id, payload] = itemsService.update.mock.calls[0];
    expect(id).toBe('other-1');
    expect(payload).toMatchObject({
      source_type: 'other_item',
      item_type: 'Cable',
      name: 'Micro Light Cable v2',
      size: '2m',
      company: 'Noctua',
      quantity: 5,
      box_id: 'box-1',
      category_id: 'cat-other',
      notes: 'spare'
    });
    expect(payload).not.toHaveProperty('other_item_type');
  });
});
