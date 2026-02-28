import { db, requireAuth } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import type { Category } from '@/types';

// Helper to transform Firestore document to Category
const transformCategory = (id: string, data: any): Category => ({
  id,
  user_id: data.user_id,
  name: data.name,
  color: data.color || '#6366F1',
  icon: data.icon || 'folder',
  order_index: data.order_index ?? 0,
  is_default: data.is_default ?? false,
  created_at: data.created_at || new Date().toISOString(),
});

export const categoryService = {
  // Get all categories for current user
  async getCategories(): Promise<Category[]> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'categories'),
      where('user_id', '==', userId),
      orderBy('order_index', 'asc'),
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => transformCategory(d.id, d.data()));
  },

  // Get category by ID
  async getCategoryById(id: string): Promise<Category | null> {
    const docRef = doc(db, 'categories', id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;
    return transformCategory(snap.id, snap.data());
  },

  // Create a new category
  async createCategory(category: Omit<Category, 'id' | 'user_id' | 'created_at'>): Promise<Category> {
    const userId = requireAuth();

    const name = (category.name || '').trim();
    if (!name || name.length > 100) {
      throw new Error('Category name must be 1-100 characters');
    }

    const insertData = {
      user_id: userId,
      name,
      color: (category.color || '#6366F1').slice(0, 7),
      icon: (category.icon || 'folder').slice(0, 50),
      order_index: Math.max(0, category.order_index || 0),
      is_default: category.is_default ?? false,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'categories'), insertData);
    return transformCategory(docRef.id, insertData);
  },

  // Update a category
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const docRef = doc(db, 'categories', id);

    const updateData: any = { ...updates };
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;

    await updateDoc(docRef, updateData);

    const snap = await getDoc(docRef);
    return transformCategory(snap.id, snap.data());
  },

  // Delete a category
  async deleteCategory(id: string): Promise<void> {
    await deleteDoc(doc(db, 'categories', id));
  },

  // Reorder categories
  async reorderCategories(categoryIds: string[]): Promise<void> {
    for (let i = 0; i < categoryIds.length; i++) {
      await updateDoc(doc(db, 'categories', categoryIds[i]), { order_index: i });
    }
  },

  // Create default categories for new user
  async createDefaultCategories(): Promise<Category[]> {
    const userId = requireAuth();

    const defaultCategories = [
      { user_id: userId, name: 'General', color: '#6366F1', icon: 'folder', order_index: 0, is_default: true, created_at: new Date().toISOString() },
      { user_id: userId, name: 'Work', color: '#10B981', icon: 'briefcase', order_index: 1, is_default: false, created_at: new Date().toISOString() },
      { user_id: userId, name: 'Personal', color: '#F59E0B', icon: 'user', order_index: 2, is_default: false, created_at: new Date().toISOString() },
    ];

    const results: Category[] = [];
    for (const cat of defaultCategories) {
      const docRef = await addDoc(collection(db, 'categories'), cat);
      results.push(transformCategory(docRef.id, cat));
    }
    return results;
  },
};
