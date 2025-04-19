export const getEnv = (): 'dev' | 'prod' => {
  return import.meta.env.DEV ? 'dev' : 'prod'
}

export const isDev = () => {
  return import.meta.env.DEV
}
