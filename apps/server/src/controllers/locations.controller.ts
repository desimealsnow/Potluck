import { Request, Response } from 'express';
import { createLocation } from '../services/locations.service';
import { components } from '../../../../libs/common/src/types.gen';
type CreateLocationInput  = components['schemas']['Location'];

export const addLocation = async (req: Request, res: Response) => {
  const input: CreateLocationInput = req.body;

  const result = await createLocation(input);

  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json(result);
};
