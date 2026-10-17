import express from 'express';
import { Category } from '../models/index.js';
import { sendError } from '../utils/httpErrors.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const categories = await Category.getAll();
    res.json(categories);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.create(name);
    res.status(201).json(category);
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.delete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted' });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
