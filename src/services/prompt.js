import { COMMON_RULES } from '../utils/constants.js';
import { supabaseQuery } from '../utils/supabase.js';
import { getUserIdFromToken } from '../middleware/auth.js';
import { buildProfileBlock } from './profile.js';

const MINDSET_PRESETS = {
  futoshi: `[MINDSET_PRESET: futoshi]
価値観:
- 周りを幸せにすればそこにお金は生まれ集まる
- 人は感情が集まるところに集まる
- 人の人生を幸せになるようにコーディネートすることが理想
- 行動力とフットワークの軽さを重視する
- 薄っぺらい自慢は価値がない。本質的な成長を追求する
- 「知らないとやろうとも思わない」を防止する。選択肢を広げる
判断基準: 「それは相手を幸せにするか？」
[/MINDSET_PRESET]`,
};

export async function buildServerSystemPrompt(body, tokenId, env, { aiMemo, ragResults } = {}) {
  const injectFields = body.profile_inject || ['nickname'];

  let profile = null;
  let identity = null;
  try {
    const userId = await getUserIdFromToken(env, tokenId);
    if (userId) {
      const [userRes, identityRes] = await Promise.all([
        supabaseQuery(env, 'users', 'GET', {
          filters: `id=eq.${userId}`,
          select: 'nickname,occupation,age,mbti,strengths,weaknesses,values,vision,constraints,ai_memo,ai_memo_updated_at',
        }),
        supabaseQuery(env, 'user_identity', 'GET', {
          filters: `user_id=eq.${userId}`,
        }),
      ]);
      if (userRes && userRes.length > 0) profile = userRes[0];
      if (identityRes && identityRes.length > 0) identity = identityRes[0];
    }
  } catch(e) {}

  let fields = injectFields;
  if (body.coaching_mode) {
    fields = ['nickname', 'occupation', 'age', 'mbti', 'strengths', 'weaknesses', 'values', 'vision', 'constraints'];
  }

  const profileBlock = buildProfileBlock(profile, fields);

  let fixedPart = '';
  if (body.role) fixedPart += `【あなたの役割】${body.role}\n\n`;
  if (profileBlock) fixedPart += `【ユーザー情報】\n${profileBlock}\n\n`;

  const mindsetKey = identity?.mindset_preset || 'futoshi';
  const mindsetText = MINDSET_PRESETS[mindsetKey];
  if (mindsetText) fixedPart += `${mindsetText}\n\n`;

  const memoText = aiMemo || profile?.ai_memo || null;
  if (env.MEMO_ENABLED === 'true' && memoText) {
    fixedPart += `【AIの理解メモ】\n${memoText}\n\n`;
  }

  fixedPart += COMMON_RULES;

  fixedPart += `\n\n【意図分類】
ユーザーの発言を以下5種に分類し、応答の冒頭に[INTENT:分類名]タグを1つ付ける:
- GOAL_CREATE: 新しい目標・やりたいことの表明（例:「ICL受けたい」「SNS始めたい」）
- TASK_CREATE: 具体的な1つのタスク・予定（例:「明日電話する」「来週までにレポート出す」）
- STATUS_UPDATE: 進捗報告・完了報告（例:「行ってきた」「終わった」「4/25に決まった」）
- LIFE_DESIGN: 自己理解・価値観・強み探求（例:「自分の強みって？」「見られ方変えたい」）
- QUESTION: 上記以外の質問・雑談・調べもの
GOAL_CREATEの場合、深掘り後に以下の構造化タグで提案する:
[GOAL_PROPOSAL]
name: ゴール名
why: なぜこのゴールか（ユーザーの動機）
deadline: YYYY-MM-DD
tasks:
- name: タスク名
  deadline: YYYY-MM-DD
[/GOAL_PROPOSAL]
深掘りが必要なら1-3往復聞いてから提案する。即座に提案できる場合は1回目で出す。`;

  if (body.system) fixedPart += `\n\n${body.system}`;

  let variablePart = '';
  if (env.RAG_ENABLED === 'true' && ragResults && ragResults.length > 0) {
    variablePart += `\n【関連する過去の会話】\n`;
    ragResults.forEach(r => { variablePart += `・${r.date}: ${r.content}\n`; });
    variablePart += `※直近の会話が最優先。過去の会話は参考情報として扱うこと\n`;
  }

  return { fixedPart, variablePart };
}
