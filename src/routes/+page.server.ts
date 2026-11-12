import { catalog } from '#lib/server/catalog.ts';
import { publicVideos } from '#lib/server/videos.ts';

export const load = async () => ({ ...(await catalog()), videos: await publicVideos() });
