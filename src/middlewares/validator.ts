import { Request, Response, NextFunction } from "express";
import Joi from "joi";

const validator = (schema: Joi.Schema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    try {
      await schema.validateAsync(req.body);
      next();
    } catch (e) {
      next(e);
    }
  };
};

export default validator;
