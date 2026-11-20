# Auth viva notes

## 1. How does register store the password?

- Controller checks first: all three fields present and strings, email has `@`, password at least 6 characters. Any fail is a 400.
- `registerUser` does `findUnique` on the email. If taken: 409 `Email already registered`.
- Hash is `bcrypt.hash(password, 10)` from `bcryptjs`. 10 = salt rounds.
- Saved in `passwordHash`, which is column `password_hash` in table `users`. The plain password is never saved, there is no column for it.
- Success is 201 with `token` and `user`. The hash is not sent back.
- Login uses `bcrypt.compare(password, user.passwordHash)`. Wrong email and wrong password both give 401 `Invalid email or password`.

## 2. What's inside the JWT, and how long does it last?

- Payload is only `{ id, email }`. No name, no password.
- Signed with `process.env.JWT_SECRET` using `jwt.sign` from `jsonwebtoken`.
- `expiresIn: '7d'`, so 7 days. No refresh token, after that you log in again.
- Browser: `api.js` reads `localStorage.token` and sends `Authorization: Bearer <token>`.

## 3. What does the auth middleware do, step by step?

1. Reads `req.headers.authorization`.
2. Missing, or does not start with `Bearer ` (with the space): 401 `Missing token`.
3. `authorization.slice(7)` cuts off `Bearer ` and leaves the token.
4. `jwt.verify(token, process.env.JWT_SECRET)`.
5. If verify throws (tampered, wrong secret, expired): 401 `Invalid or expired token`.
6. If ok: `req.user = { id: decoded.id, email: decoded.email }`, then `next()`.

No database call here.

## 4. Why do other users' monitors return 404 and not 403?

- `getMonitor(userId, id)` runs `prisma.monitor.findFirst({ where: { id: Number(id), userId } })`.
- `userId` is `req.user.id` from the token, never from the URL or body.
- Someone else's monitor does not match the `where`, so it comes back `null`, same as an id that does not exist.
- Controller: `if (!monitor) return notFound(res)`, which is 404 `Monitor not found`.
- Update and delete filter on `{ id, userId }` the same way.
- Why not 403: a 403 says "this id exists but is not yours". Ids are autoincrement ints, so someone could try 1, 2, 3 and learn which monitors exist. With 404 they learn nothing.
