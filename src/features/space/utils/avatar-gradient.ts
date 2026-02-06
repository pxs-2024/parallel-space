/**
 * 一组温柔且对比明显的渐变色（双色线性渐变），用于头像等占位背景，白字对比清晰
 */
const AVATAR_GRADIENTS = [
	"linear-gradient(135deg, #d4b0e8 0%, #8b5ca8 100%)",
	"linear-gradient(135deg, #f0c0d0 0%, #c96888 100%)",
	"linear-gradient(135deg, #8ec8e0 0%, #4a7d98 100%)",
	"linear-gradient(135deg, #8ed4a8 0%, #4a9068 100%)",
	"linear-gradient(135deg, #f0d0a0 0%, #b88850 100%)",
	"linear-gradient(135deg, #90d0e0 0%, #508898 100%)",
	"linear-gradient(135deg, #c8b8f0 0%, #8060b0 100%)",
	"linear-gradient(135deg, #f0e0a8 0%, #b89848 100%)",
	"linear-gradient(135deg, #8ec0f0 0%, #4a78b8 100%)",
	"linear-gradient(135deg, #b898d8 0%, #7850a0 100%)",
	"linear-gradient(135deg, #90d8a8 0%, #508858 100%)",
	"linear-gradient(135deg, #f0a0c0 0%, #b85078 100%)",
	"linear-gradient(135deg, #80c8c8 0%, #406868 100%)",
	"linear-gradient(135deg, #d090c8 0%, #905080 100%)",
	"linear-gradient(135deg, #e8d088 0%, #b09038 100%)",
] as const;

/**
 * 根据字符串生成简单稳定的哈希值（用于同一名称始终得到同一渐变）
 */
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash);
}

/**
 * 根据名称返回一个稳定的好看渐变色，可作为 background 或 backgroundImage 使用
 */
export function getAvatarGradient(name: string): string {
	const index = hashString(name) % AVATAR_GRADIENTS.length;
	return AVATAR_GRADIENTS[index];
}

/**
 * 透明渐变（低饱和度 + 低 alpha），适合卡片背景，亮/暗主题都好看
 */
const TRANSPARENT_CARD_GRADIENTS = [
	"linear-gradient(135deg, rgba(180,140,220,0.06) 0%, rgba(120,80,180,0.18) 100%)",
	"linear-gradient(135deg, rgba(240,160,200,0.06) 0%, rgba(200,80,140,0.18) 100%)",
	"linear-gradient(135deg, rgba(120,200,230,0.08) 0%, rgba(60,140,180,0.2) 100%)",
	"linear-gradient(135deg, rgba(120,220,160,0.07) 0%, rgba(60,160,100,0.2) 100%)",
	"linear-gradient(135deg, rgba(230,200,120,0.08) 0%, rgba(180,140,60,0.2) 100%)",
	"linear-gradient(135deg, rgba(160,220,240,0.07) 0%, rgba(80,160,200,0.2) 100%)",
	"linear-gradient(135deg, rgba(200,180,240,0.06) 0%, rgba(130,100,200,0.18) 100%)",
	"linear-gradient(135deg, rgba(240,220,140,0.07) 0%, rgba(200,160,60,0.2) 100%)",
	"linear-gradient(135deg, rgba(140,200,240,0.07) 0%, rgba(70,130,200,0.2) 100%)",
	"linear-gradient(135deg, rgba(200,160,230,0.06) 0%, rgba(140,80,180,0.18) 100%)",
	"linear-gradient(135deg, rgba(140,230,180,0.07) 0%, rgba(80,180,120,0.2) 100%)",
	"linear-gradient(135deg, rgba(240,140,180,0.06) 0%, rgba(200,70,120,0.18) 100%)",
	"linear-gradient(135deg, rgba(120,220,220,0.07) 0%, rgba(60,160,160,0.2) 100%)",
	"linear-gradient(135deg, rgba(220,150,210,0.06) 0%, rgba(160,80,160,0.18) 100%)",
	"linear-gradient(135deg, rgba(230,210,130,0.08) 0%, rgba(190,150,50,0.2) 100%)",
] as const;

/**
 * 根据名称返回稳定的透明渐变，用于物体卡片等，与背景融合
 */
export function getTransparentCardGradient(name: string): string {
	const index = hashString(name) % TRANSPARENT_CARD_GRADIENTS.length;
	return TRANSPARENT_CARD_GRADIENTS[index];
}
