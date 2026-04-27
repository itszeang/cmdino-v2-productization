const cache = new Map<string, HTMLImageElement>();

export function getAssetPath(dinoId: string, category: string, anim: string): string {
  const [gender, name] = dinoId.split("-");
  return `/${gender}/${name}/${category}/${anim}.png`;
}

export function loadAsset(
  dinoId: string,
  category: string,
  anim: string
): Promise<HTMLImageElement> {
  const key = `${dinoId}/${category}/${anim}`;
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = getAssetPath(dinoId, category, anim);
    img.onload = () => {
      cache.set(key, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load: ${img.src}`));
  });
}

export function preloadDino(dinoId: string): void {
  const categories = [
    ["base", ["idle", "move", "dash", "scan", "avoid", "hurt", "dead", "jump", "bite", "kick"]],
    ["egg",  ["crack", "hatch", "move"]],
    ["ghost", ["idle", "move"]],
  ] as [string, string[]][];

  for (const [cat, anims] of categories) {
    for (const anim of anims) {
      loadAsset(dinoId, cat, anim).catch(() => {});
    }
  }
}
