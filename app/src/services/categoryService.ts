/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { success, failure, type Result, AppError } from '@/lib/errors';
import type { Category } from '@/types';

const ALLOWED_CATEGORY_ICONS = new Set(['folder', 'briefcase', 'user']);

const transformCategory = (id: string, data: any): Category => ({
  id,
  user_id: data.user_id,
  name: data.name,
  color: data.color,
  icon: data.icon,
  order_index: data.order_index || 0,
  is_default: data.is_default || false,
  created_at: data.created_at || new Date().toISOString(),
});

const userCategoriesCollection = (userId: string) => collection(db, 'users', userId, 'categories');

const stripUndefined = <T extends Record<string, any>>(value: T): T => {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  return Object.fromEntries(entries) as T;
};

export const categoryService = {
  async getCategories(): Promise<Result<Category[]>> {
    try {
      const userId = await requireAuth();
      const snapshot = await getDocs(userCategoriesCollection(userId));
      const categories = snapshot.docs
        .map((categoryDoc) => transformCategory(categoryDoc.id, categoryDoc.data()))
        .sort((a, b) => a.order_index - b.order_index);
      logger.info('Categories retrieved successfully', { userId, count: categories.length });
      return success(categories);
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError({
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve categories',
        statusCode: 500,
        context: { operation: 'getCategories' },
      });
      logger.error('Failed to retrieve categories', appError as any);
      return failure(appError);
    }
  },

  async getCategoryById(id: string): Promise<Result<Category | null>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Category ID must be a non-empty string',
          statusCode: 400,
        });
      }
      const userId = await requireAuth();
      const categoryRef = doc(db, 'users', userId, 'categories', id);
      const categorySnap = await getDoc(categoryRef);

      if (!categorySnap.exists()) {
        logger.info('Category not found', { userId, categoryId: id });
        return success(null);
      }

      const category = transformCategory(categorySnap.id, categorySnap.data());
      logger.info('Category retrieved', { userId, categoryId: id });
      return success(category);
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError({
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve category',
        statusCode: 500,
        context: { operation: 'getCategoryById', categoryId: id },
      });
      logger.error('Failed to retrieve category', appError as any);
      return failure(appError);
    }
  },

  async createCategory(category: Omit<Category, 'id' | 'user_id' | 'created_at'>): Promise<Result<Category>> {
    try {
      const userId = await requireAuth();

      const name = (category.name || '').trim();
      if (!name || name.length > 100) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Category name must be 1-100 characters',
          statusCode: 400,
        });
      }

      const collectionRef = userCategoriesCollection(userId);
      const categoryRef = doc(collectionRef);
      const now = new Date().toISOString();

      const icon = (category.icon || 'folder').slice(0, 50);
      const insertData = {
        user_id: userId,
        name,
        color: (category.color || '#6366F1').slice(0, 7),
        icon: ALLOWED_CATEGORY_ICONS.has(icon) ? icon : 'folder',
        order_index: Math.max(0, category.order_index || 0),
        is_default: category.is_default ?? false,
        created_at: now,
      };

      await setDoc(categoryRef, insertData);
      const newCategory = transformCategory(categoryRef.id, insertData);
      logger.info('Category created', { userId, categoryId: categoryRef.id, name });
      return success(newCategory);
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError({
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create category',
        statusCode: 500,
        context: { operation: 'createCategory' },
      });
      logger.error('Failed to create category', appError as any);
      return failure(appError);
    }
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Result<Category>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Category ID must be a non-empty string',
          statusCode: 400,
        });
      }
      const userId = await requireAuth();
      const categoryRef = doc(db, 'users', userId, 'categories', id);
      const categorySnap = await getDoc(categoryRef);

      if (!categorySnap.exists()) {
        throw new AppError({
          code: 'NOT_FOUND',
          message: 'Category not found',
          statusCode: 404,
        });
      }

      const updateData = stripUndefined({ ...updates });
      delete (updateData as any).id;
      delete (updateData as any).user_id;
      delete (updateData as any).created_at;

      await setDoc(categoryRef, updateData, { merge: true });
      const updatedSnap = await getDoc(categoryRef);

      if (!updatedSnap.exists()) {
        throw new AppError({
          code: 'NOT_FOUND',
          message: 'Category not found after update',
          statusCode: 404,
        });
      }

      const updatedCategory = transformCategory(updatedSnap.id, updatedSnap.data());
      logger.info('Category updated', { userId, categoryId: id });
      return success(updatedCategory);
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError({
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update category',
        statusCode: 500,
        context: { operation: 'updateCategory', categoryId: id },
      });
      logger.error('Failed to update category', appError as any);
      return failure(appError);
    }
  },

  async deleteCategory(id: string): Promise<Result<void>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Category ID must be a non-empty string',
          statusCode: 400,
        });
      }
      const userId = await requireAuth();
      const categoryRef = doc(db, 'users', userId, 'categories', id);
      await deleteDoc(categoryRef);
      logger.info('Category deleted', { userId, categoryId: id });
      return success(undefined);
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError({
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete category',
        statusCode: 500,
        context: { operation: 'deleteCategory', categoryId: id },
      });
      logger.error('Failed to delete category', appError as any);
      return failure(appError);
    }
  },

  async reorderCategories(categoryIds: string[]): Promise<Result<void>> {
    try {
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'categoryIds must be a non-empty array',
          statusCode: 400,
        });
      }
      const userId = await requireAuth();
      const batch = writeBatch(db);

      categoryIds.forEach((id, index) => {
        const categoryRef = doc(db, 'users', userId, 'categories', id);
        batch.set(categoryRef, { order_index: index }, { merge: true });
      });

      await batch.commit();
      logger.info('Categories reordered', { userId, count: categoryIds.length });
      return success(undefined);
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError({
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reorder categories',
        statusCode: 500,
        context: { operation: 'reorderCategories' },
      });
      logger.error('Failed to reorder categories', appError as any);
      return failure(appError);
    }
  },

  async createDefaultCategories(): Promise<Result<Category[]>> {
    try {
      const userId = await requireAuth();
      const now = new Date().toISOString();
      const categoriesRef = userCategoriesCollection(userId);

      const created: Category[] = [];
      for (const item of [
        { user_id: userId, name: 'General', color: '#6366F1', icon: 'folder', order_index: 0, is_default: true, created_at: now },
        { user_id: userId, name: 'Work', color: '#10B981', icon: 'briefcase', order_index: 1, is_default: false, created_at: now },
        { user_id: userId, name: 'Personal', color: '#F59E0B', icon: 'user', order_index: 2, is_default: false, created_at: now },
      ]) {
        const categoryRef = doc(categoriesRef);
        await setDoc(categoryRef, item);
        created.push(transformCategory(categoryRef.id, item));
      }
      logger.info('Default categories created', { userId, count: created.length });
      return success(created);
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError({
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create default categories',
        statusCode: 500,
        context: { operation: 'createDefaultCategories' },
      });
      logger.error('Failed to create default categories', appError as any);
      return failure(appError);
    }
  },
};
