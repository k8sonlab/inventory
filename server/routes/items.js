import express from 'express';
import { Item, RCPart, Screw, Nut, Bearing, OilPaste, Battery } from '../models/index.js';

const router = express.Router();

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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// Create item
router.post('/', async (req, res) => {
  try {
    let item;
    if (req.body.source_type === 'screw' || req.body.item_type === 'Screws') {
      item = await Screw.create(req.body);
    } else if (req.body.source_type === 'nut' || req.body.item_type === 'Nuts') {
      item = await Nut.create(req.body);
    } else if (req.body.source_type === 'bearing' || req.body.item_type === 'Bearings') {
      item = await Bearing.create(req.body);
    } else if (req.body.source_type === 'oil_paste' || req.body.item_type === 'Oils/Pastes') {
      item = await OilPaste.create(req.body);
    } else if (req.body.source_type === 'battery' || req.body.item_type === 'Batteries') {
      item = await Battery.create(req.body);
    } else if (req.body.source_type === 'rc_part' || req.body.item_type === 'RC Parts') {
      item = await RCPart.create(req.body);
    } else {
      item = await Item.create(req.body);
    }
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update item
router.put('/:id', async (req, res) => {
  try {
    let item;
    if (req.body.source_type === 'screw' || req.body.item_type === 'Screws') {
      item = await Screw.update(req.params.id, req.body);
    } else if (req.body.source_type === 'nut' || req.body.item_type === 'Nuts') {
      item = await Nut.update(req.params.id, req.body);
    } else if (req.body.source_type === 'bearing' || req.body.item_type === 'Bearings') {
      item = await Bearing.update(req.params.id, req.body);
    } else if (req.body.source_type === 'oil_paste' || req.body.item_type === 'Oils/Pastes') {
      item = await OilPaste.update(req.params.id, req.body);
    } else if (req.body.source_type === 'battery' || req.body.item_type === 'Batteries') {
      item = await Battery.update(req.params.id, req.body);
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
    res.status(400).json({ error: error.message });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    let item;
    if (req.body.source_type === 'screw' || req.body.item_type === 'Screws') {
      item = await Screw.delete(req.params.id);
    } else if (req.body.source_type === 'nut' || req.body.item_type === 'Nuts') {
      item = await Nut.delete(req.params.id);
    } else if (req.body.source_type === 'bearing' || req.body.item_type === 'Bearings') {
      item = await Bearing.delete(req.params.id);
    } else if (req.body.source_type === 'oil_paste' || req.body.item_type === 'Oils/Pastes') {
      item = await OilPaste.delete(req.params.id);
    } else if (req.body.source_type === 'battery' || req.body.item_type === 'Batteries') {
      item = await Battery.delete(req.params.id);
    } else if (req.body.source_type === 'rc_part' || req.body.item_type === 'RC Parts') {
      item = await RCPart.delete(req.params.id);
    } else {
      item = await Item.delete(req.params.id);
    }
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
