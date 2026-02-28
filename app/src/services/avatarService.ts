const AVATAR_STYLE = 'adventurer-neutral';

function sanitizeSeed(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/gi, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

function buildSeed(username?: string, email?: string, userId?: string, nonce?: string): string {
  const base = username || email?.split('@')[0] || userId || 'remembra-user';
  return sanitizeSeed(nonce ? `${base}-${nonce}` : base);
}

export const avatarService = {
  generateProfileAvatarUrl(params: {
    username?: string;
    email?: string;
    userId?: string;
    nonce?: string;
    size?: number;
  }): string {
    const seed = buildSeed(params.username, params.email, params.userId, params.nonce);
    const size = Math.max(64, Math.min(512, params.size || 160));
    const query = new URLSearchParams({
      seed,
      size: String(size),
      radius: '50',
      backgroundType: 'gradientLinear',
      backgroundColor: 'ff8000,ff6b00,e81224',
    });
    return `https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg?${query.toString()}`;
  },
};
