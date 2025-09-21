import { Request, Response } from 'express';
import * as S from '../services/items.library.service';
import { handle } from '../utils/helper';

export async function listCatalog(req: Request, res: Response) {
  const q = (req.query.q as string | undefined) || undefined;
  const category = (req.query.category as string | undefined) || undefined;
  return handle(res, await S.listCatalog({ q, category }));
}

export async function listMyItems(req: Request, res: Response) {
  return handle(res, await S.listMyItems(req.user!.id));
}

export async function createMyItem(req: Request, res: Response) {
  return handle(res, await S.createMyItem(req.user!.id, req.body));
}

export async function updateMyItem(req: Request, res: Response) {
  return handle(res, await S.updateMyItem(req.user!.id, req.params.id, req.body));
}

export async function deleteMyItem(req: Request, res: Response) {
  return handle(res, await S.deleteMyItem(req.user!.id, req.params.id));
}

