import { getSupabase, requireAuth } from '@/lib/supabase';
import type { Category } from '@/types';

// Helper to transform database record to Category
const transformCategory = (data: any): Category => ({
  id: data.id,
  user_id: data.user_id,
  name: data.name,
  color: data.color,
  icon: data.icon,
  order_index: data.order_index,
  is_default: data.is_default,
  created_at: data.created_at,
});

export const categoryService = {
  // Get all categories for current user
  async getCategories(): Promise<Category[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });
    
    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
    
    return (data || []).map(transformCategory);
  },

  // Get category by ID
  async getCategoryById(id: string): Promise<Category | null> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching category:', error);
      throw error;
    }
    
    return data ? transformCategory(data) : null;
  },

  // Create a new category
  async createCategory(category: Omit<Category, 'id' | 'user_id' | 'created_at'>): Promise<Category> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const insertData = {
      user_id: userId,
      name: category.name,
      color: category.color,
      icon: category.icon,
      order_index: category.order_index,
      is_default: category.is_default,
    };
    
    const { data, error } = await supabase
      .from('categories')
      .insert(insertData as any)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating category:', error);
      throw error;
    }
    
    return transformCategory(data);
  },

  // Update a category
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const supabase = getSupabase();
    
    const updateData: any = { ...updates };
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;
    
    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }
    
    return transformCategory(data);
  },

  // Delete a category
  async deleteCategory(id: string): Promise<void> {
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // Reorder categories
  async reorderCategories(categoryIds: string[]): Promise<void> {
    const supabase = getSupabase();
    
    for (let i = 0; i < categoryIds.length; i++) {
      const { error } = await supabase
        .from('categories')
        .update({ order_index: i } as any)
        .eq('id', categoryIds[i]);
      
      if (error) {
        console.error('Error reordering categories:', error);
        throw error;
      }
    }
  },

  // Create default categories for new user
  async createDefaultCategories(): Promise<Category[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const defaultCategories = [
      { user_id: userId, name: 'General', color: '#6366F1', icon: 'folder', order_index: 0, is_default: true },
      { user_id: userId, name: 'Work', color: '#10B981', icon: 'briefcase', order_index: 1, is_default: false },
      { user_id: userId, name: 'Personal', color: '#F59E0B', icon: 'user', order_index: 2, is_default: false },
    ];
    
    const { data, error } = await supabase
      .from('categories')
      .insert(defaultCategories as any)
      .select();
    
    if (error) {
      console.error('Error creating default categories:', error);
      throw error;
    }
    
    return (data || []).map(transformCategory);
  },
};
