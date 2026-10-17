import express from 'express';
import { Item, RCPart, Screw, Nut, Bearing, OilPaste, Battery, OtherItem, WasherBearing, isQuantitySourceType, updateItemQuantity } from '../models/index.js';
import { sendError } from '../utils/httpErrors.js';

const router = express.Router();

function validateQuantity(req, res, next) {
  if (req.body?.quantity !== undefined &&
      (!Number.isInteger(req.body.quantity) || req.body.quantity < 0 || req.body.quantity > 2147483647)) {
    return res.status(400).json({ error: 'Quantity must be a whole number between 0 and 2147483647' });
  }
  next();
}

// Get all items with optional filters (includes RC Parts)
router.get('/', async (req, res) => {
  try {
    const filters = {
      category_id: req.query.category_id,
      search: req.query.search,
    };
    const items = await RCPart.getAllCombined(filters);
    res.json(items);
  } catch (error) {
    sendError(res, error);
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    sendError(res, error);
  }
});

// Create item
router.post('/', validateQuantity, async (req, res) => {
  try {
    let item;
    if (req.body.source_type === 'screw' || req.body.item_type === 'Screws') {
      item = await Screw.create(req.body);
    } else if (req.body.source_type === 'nut' || req.body.item_type === 'Nuts') {
      item = await Nut.create(req.body);
    } else if (req.body.source_type === 'washer_bearing' || req.body.item_type === 'Washers & Bearings') {
      item = await WasherBearing.create(req.body);
    } else if (req.body.source_type === 'bearing' || req.body.item_type === 'Bearings') {
      item = await Bearing.create(req.body);
    } else if (req.body.source_type === 'oil_paste' || req.body.item_type === 'Oils/Pastes') {
      item = await OilPaste.create(req.body);
    } else if (req.body.source_type === 'battery' || req.body.item_type === 'Batteries') {
      item = await Battery.create(req.body);
    } else if (req.body.source_type === 'other_item' || req.body.item_type === 'Other Items') {
      item = await OtherItem.create(req.body);
    } else if (req.body.source_type === 'rc_part' || req.body.item_type === 'RC Parts') {
      item = await RCPart.create(req.body);
    } else {
      item = await Item.create(req.body);
    }
    res.status(201).json(item);
  } catch (error) {
    sendError(res, error, 400);
  }
});

// Update quantity only
router.patch('/:id/quantity', async (req, res) => {
  const { source_type, quantity, expected_quantity } = req.body || {};
  if (!isQuantitySourceType(source_type) ||
      !Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647 ||
      !Number.isInteger(expected_quantity) ||
      Object.keys(req.body || {}).some(key => !['source_type', 'quantity', 'expected_quantity'].includes(key))) {
    return res.status(400).json({ error: 'Provide a valid source_type, a whole-number quantity between 0 and 2147483647, and integer expected_quantity only.' });
  }
  try {
    const result = await updateItemQuantity(req.params.id, source_type, quantity, expected_quantity);
    if (result.notFound) return res.status(404).json({ error: 'Item not found' });
    if (result.conflict) {
      return res.status(409).json({ error: 'Quantity changed since you started editing. Review the current quantity and try again.', quantity: result.quantity });
    }
    res.json(result.item);
  } catch (error) {
    console.error('Failed to update item quantity:', error);
    res.status(500).json({ error: 'Failed to update item quantity' });
  }
});

// Update item
router.put('/:id', validateQuantity, async (req, res) => {
  try {
    let item;
    if (req.body.source_type === 'screw' || req.body.item_type === 'Screws') {
      item = await Screw.update(req.params.id, req.body);
    } else if (req.body.source_type === 'nut' || req.body.item_type === 'Nuts') {
      item = await Nut.update(req.params.id, req.body);
    } else if (req.body.source_type === 'washer_bearing' || req.body.item_type === 'Washers & Bearings') {
      item = await WasherBearing.update(req.params.id, req.body);
    } else if (req.body.source_type === 'bearing' || req.body.item_type === 'Bearings') {
      item = await Bearing.update(req.params.id, req.body);
    } else if (req.body.source_type === 'oil_paste' || req.body.item_type === 'Oils/Pastes') {
      item = await OilPaste.update(req.params.id, req.body);
    } else if (req.body.source_type === 'battery' || req.body.item_type === 'Batteries') {
      item = await Battery.update(req.params.id, req.body);
    } else if (req.body.source_type === 'other_item' || req.body.item_type === 'Other Items') {
      item = await OtherItem.update(req.params.id, req.body);
    } else if (req.body.source_type === 'rc_part' || req.body.item_type === 'RC Parts') {
      item = await RCPart.update(req.params.id, req.body);
    } else {
      item = await Item.update(req.params.id, req.body);
    }
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    sendError(res, error, 400);
  }
});

// Delete item. The table is chosen by source_type, sent as a query parameter (DELETE bodies are dropped by some proxies) or in the body.
router.delete('/:id', async (req, res) => {
  try {
    let item;
    const target = { source_type: req.query.source_type ?? req.body?.source_type, item_type: req.body?.item_type };
    if (target.source_type === 'screw' || target.item_type === 'Screws') {
      item = await Screw.delete(req.params.id);
    } else if (target.source_type === 'nut' || target.item_type === 'Nuts') {
      item = await Nut.delete(req.params.id);
    } else if (target.source_type === 'washer_bearing' || target.item_type === 'Washers & Bearings') {
      item = await WasherBearing.delete(req.params.id);
    } else if (target.source_type === 'bearing' || target.item_type === 'Bearings') {
      item = await Bearing.delete(req.params.id);
    } else if (target.source_type === 'oil_paste' || target.item_type === 'Oils/Pastes') {
      item = await OilPaste.delete(req.params.id);
    } else if (target.source_type === 'battery' || target.item_type === 'Batteries') {
      item = await Battery.delete(req.params.id);
    } else if (target.source_type === 'other_item' || target.item_type === 'Other Items') {
      item = await OtherItem.delete(req.params.id);
    } else if (target.source_type === 'rc_part' || target.item_type === 'RC Parts') {
      item = await RCPart.delete(req.params.id);
    } else {
      item = await Item.delete(req.params.id);
    }
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted' });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
