/** Serializable auth snapshot for route context / chrome (no server imports). */
export type AuthSession = {
  userId: string
  email: string
  username: string | null
  emailVerified: boolean
}
