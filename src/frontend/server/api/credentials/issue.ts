import { createError, defineEventHandler, getHeader, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Get API URL from runtime config
    const config = useRuntimeConfig()
    const apiUrl = config.public.apiUrl

    // Get authorization header
    const authorization = getHeader(event, 'authorization')
    if (!authorization) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required'
      })
    }

    // Extract the token
    const token = authorization.replace('Bearer ', '')
    if (!token) {
      throw createError({
        statusCode: 401,
        message: 'Invalid authorization token'
      })
    }

    // Read request body
    const body = await readBody(event)
    if (!body || !body.data || !body.data.achievementId) {
      throw createError({
        statusCode: 400,
        message: 'Invalid request: achievementId is required'
      })
    }

    // Forward request to backend
    const response = await fetch(`${apiUrl}/api/credentials/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body),
      // Important: Don't include credentials (cookies) in the request to Strapi
      credentials: 'omit'
    })

    // Handle error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: `Request failed with status ${response.status}` }
      }))

      throw createError({
        statusCode: response.status,
        statusMessage: response.statusText,
        data: errorData
      })
    }

    // Return successful response
    const result = await response.json()
    return result
  }
  catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal Server Error',
      message: error.message || 'Failed to issue credential',
      data: error.data
    })
  }
})
