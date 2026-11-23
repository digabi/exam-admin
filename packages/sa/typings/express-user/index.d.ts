// Extends passport's empty Express.User with the shape passport-setup.js's
// deserializeUser actually produces, per the documented @types/passport pattern.
declare global {
  namespace Express {
    interface User {
      userId: string
      userName: string
    }
  }
}

export {}
