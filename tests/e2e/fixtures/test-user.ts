// GOAL AI — テスト用ユーザー設定
export const TEST_USER = {
  email: 'test@goalai.dev',
  password: 'test-password-goalai',
  name: 'Test User',
};

export const TEST_PLANS = {
  free: { name: 'Free', expectedModels: ['sonnet', 'mini', 'flash'] },
  light: { name: 'Light', expectedModels: ['sonnet', 'mini', 'flash'] },
  pro: { name: 'Pro', expectedModels: ['sonnet-4.6', 'gpt-5', 'flash'] },
  max: { name: 'Max', expectedModels: ['opus-4.6', 'gpt-5', '2.5-pro'] },
  ultra: { name: 'Ultra', expectedModels: ['opus-4.6', 'gpt-5', '2.5-pro'] },
};
