import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).json({
      code: 403,
      message: "토큰이 제공되지 않았습니다.",
    });
  }

  try {
    console.log(process.env.JWT_SECRET_KEY);
    req.decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log(req.decoded);
    return next();
  } catch (e) {
    if (e.name === "TokenExpireError") {
      return res.status(419).json({
        code: 419,
        message: "토큰이 만료되었습니다.",
      });
    }
    // 토큰의 비밀키가 일치하지 않는 경우
    if (e.name === "JsonWebTokenError") {
      return res.status(401).json({
        code: 401,
        message: "유효하지 않은 토큰입니다.",
      });
    }
    return res.status(500).json(e);
  }
};

export default verifyToken;
