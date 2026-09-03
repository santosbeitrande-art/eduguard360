import { handleBuilding360Route } from '../../_lib/building360ProxyRoute.js';

export default async function handler(req, res) {
  return handleBuilding360Route(req, res, '/units');
}
