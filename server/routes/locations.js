import express from 'express';
import { Shelf, Box } from '../models/index.js';

const router = express.Router();

// Shelves
router.get('/shelves', async (req, res) => {
  try {
    const shelves = await Shelf.getAll();
    res.json(shelves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shelves', async (req, res) => {
  try {
    const { shelf_code, location, notes } = req.body;
    const shelf = await Shelf.create(shelf_code, location, notes);
    res.status(201).json(shelf);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Boxes
router.get('/boxes', async (req, res) => {
  try {
    const boxes = await Box.getAll();
    res.json(boxes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/boxes/shelf/:shelf_id', async (req, res) => {
  try {
    const boxes = await Box.getByShelfId(req.params.shelf_id);
    res.json(boxes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/boxes', async (req, res) => {
  try {
    const { shelf_id, storage_id, box_name, box_type } = req.body;
    const box = await Box.create(shelf_id, storage_id, box_name, box_type);
    res.status(201).json(box);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/boxes/:id', async (req, res) => {
  try {
    const box = await Box.delete(req.params.id);
    if (!box) {
      return res.status(404).json({ error: 'Box not found' });
    }
    res.json({ message: 'Box deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
