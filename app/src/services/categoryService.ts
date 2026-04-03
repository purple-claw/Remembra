/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
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
  async getCategories(): Promise<Category[]> {
    const userId = await requireAuth();
    const snapshot = await getDocs(userCategoriesCollection(userId));

    return snapshot.docs
      .map((categoryDoc) => transformCategory(categoryDoc.id, categoryDoc.data()))
      .sort((a, b) => a.order_index - b.order_index);
  },

  async getCategoryById(id: string): Promise<Category | null> {
    const userId = await requireAuth();
    const categoryRef = doc(db, 'users', userId, 'categories', id);
    const categorySnap = await getDoc(categoryRef);

    if (!categorySnap.exists()) {
      return null;
    }

    return transformCategory(categorySnap.id, categorySnap.data());
  },

  async createCategory(category: Omit<Category, 'id' | 'user_id' | 'created_at'>): Promise<Category> {
    const userId = await requireAuth();

    const name = (category.name || '').trim();
    if (!name || name.length > 100) {
      throw new Error('Category name must be 1-100 characters');
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
    return transformCategory(categoryRef.id, insertData);
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const userId = await requireAuth();
    const categoryRef = doc(db, 'users', userId, 'categories', id);
    const categorySnap = await getDoc(categoryRef);

    if (!categorySnap.exists()) {
      throw new Error('Category not found');
    }

    const updateData = stripUndefined({ ...updates });
    delete (updateData as any).id;
    delete (updateData as any).user_id;
    delete (updateData as any).created_at;

    await setDoc(categoryRef, updateData, { merge: true });
    const updatedSnap = await getDoc(categoryRef);

    if (!updatedSnap.exists()) {
      throw new Error('Category not found after update');
    }

    return transformCategory(updatedSnap.id, updatedSnap.data());
  },

  async deleteCategory(id: string): Promise<void> {
    const userId = await requireAuth();
    const categoryRef = doc(db, 'users', userId, 'categories', id);
    await deleteDoc(categoryRef);
  },

  async reorderCategories(categoryIds: string[]): Promise<void> {
    const userId = await requireAuth();
    const batch = writeBatch(db);

    categoryIds.forEach((id, index) => {
      const categoryRef = doc(db, 'users', userId, 'categories', id);
      batch.set(categoryRef, { order_index: index }, { merge: true });
    });

    await batch.commit();
  },

  async createDefaultCategories(): Promise<Category[]> {
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

    return created;
  },
};
