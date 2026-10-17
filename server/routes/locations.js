import express from 'express';
import { Shelf, Box } from '../models/index.js';
import { sendError } from '../utils/httpErrors.js';

const router = express.Router();

// Shelves
router.get('/shelves', async (req, res) => {
  try {
    const shelves = await Shelf.getAll();
    res.json(shelves);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/shelves', async (req, res) => {
  try {
    const { shelf_code, location, notes } = req.body;
    const shelf = await Shelf.create(shelf_code, location, notes);
    res.status(201).json(shelf);
  } catch (error) {
    sendError(res, error, 400);
  }
});

// Boxes
router.get('/boxes', async (req, res) => {
  try {
    const boxes = await Box.getAll();
    res.json(boxes);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/boxes/shelf/:shelf_id', async (req, res) => {
  try {
    const boxes = await Box.getByShelfId(req.params.shelf_id);
    res.json(boxes);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/boxes', async (req, res) => {
  try {
    const { shelf_id, storage_id, box_name, box_type } = req.body;
    const box = await Box.create(shelf_id, storage_id, box_name, box_type);
    res.status(201).json(box);
  } catch (error) {
    sendError(res, error, 400);
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
    sendError(res, error);
  }
});

export default router;
