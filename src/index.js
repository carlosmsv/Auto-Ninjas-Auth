require('dotenv').config()
const bcrypt = require('bcryptjs')
var buffer = require('buffer/').Buffer
const express = require('express')
const port = 3000

const cors = require('cors')

const app = express()
app.use(cors())
/* 
  In this code, we're correctly using app.use(cors()) to allow cross-origin requests.
  However, in a production setting, we might want to configure the CORS settings more specifically
  (allow only certain domains).
*/

app.use(express.json())

const jwt = require('jsonwebtoken')

const SECRET_KEY = process.env.SECRET_KEY
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY

// Sample users for v1 authentication. In a real application, user data should be fetched from a database, with encrypted passwords.
const users = [
  {
    username: 'chris@google.com',
    password: 'mysecretpassword',
    role: 'Admin',
  },
  {
    username: 'dog76@aol.com',
    password: 'password123',
    role: 'User',
    vehicles: [
      {
        year: 2024,
        make: 'BMW',
        model: 'X3',
        trim: {
          name: '330i xDrive',
          gid: 13332,
        },
      },
      {
        year: 2025,
        make: 'AUDI',
        model: 'A4',
        trim: {
          name: '40 Premium Plus',
          gid: 12245,
        },
      },
    ],
  },
  {
    username: 'rat76@aol.com',
    password: 'chris@google.com',
    role: 'Affiliate',
  },
  {
    username: 'chris@google.com',
    password: 'Womp!889',
    role: 'User',
    vehicles: [
      {
        year: 2024,
        make: 'JEEP',
        model: 'WRANGLER UNLIMITED',
        trim: {
          name: '4XE',
          gid: 24455,
        },
      },
      {
        year: 2025,
        make: 'MERCEDES-BENZ',
        model: 'GLS',
        trim: {
          name: '4D WAGON GLS450 4WD',
          gid: 55544,
        },
      },
    ],
  },
]

let refreshTokens = [] // Temporary in-memory store for refresh tokens. Ideally we would use a database or cookies for production.

// Auth endpoint (version 1) - Uses x-api-auth header with base64 encoded credentials (username:password)
app.get('/v1/auth', (request, response) => {
  console.log('Request headers are : ' + JSON.stringify(request.headers))

  const xApiAuth = JSON.stringify(request.headers['x-api-auth'])
  if (!xApiAuth) {
    return response
      .status(400)
      .send({ message: 'No x-api-auth header provided' })
  }
  const decodedAuthHeader = buffer.from(xApiAuth, 'base64').toString('ascii')
  const username = decodedAuthHeader.split(':')[0]
  const password = decodedAuthHeader.split(':')[1]

  const matchedUser = users.find(
    (user) => user.username === username && user.password === password
  )

  if (matchedUser) {
    return response.status(200).send({
      role: matchedUser.role,
      username: matchedUser.username,
    })
  } else {
    return response.status(401).send('Unauthorized')
  }
})

// User Data endpoint - Given an auth token in the header (x-api-auth), returns user's list of cars
app.get('/v1/userdata', (request, response) => {
  const xApiAuth = JSON.stringify(request.headers['x-api-auth'])
  if (!xApiAuth) {
    return response
      .status(400)
      .send({ message: 'No x-api-auth header provided' })
  }
  const decodedAuthHeader = buffer.from(xApiAuth, 'base64').toString('ascii')
  const username = decodedAuthHeader.split(':')[0]
  const password = decodedAuthHeader.split(':')[1]
  const matchedUser = users.find(
    (user) => user.username === username && user.password === password
  )
  if (matchedUser) {
    const vehicles = matchedUser.vehicles.map((vehicle) => {
      return `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim.name}`
    })
    return response.status(200).send({
      vehicles: vehicles,
    })
  } else {
    return response.status(401).send('Unauthorized')
  }
})

// API v2 - User registration and authentication using bcryptjs for password hashing.
app.post('/v2/register', async (request, response) => {
  const { username, password } = request.body

  if (!username || !password) {
    return response.status(400).send({ message: 'Missing required fields' })
  }

  const existingUser = users.find((user) => user.username === username)

  if (existingUser) {
    return response.status(400).send({ message: 'User already exists' })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    users.push({
      username,
      password: hashedPassword,
      role: 'User',
      vehicles: [],
    })

    return response
      .status(201)
      .send({ message: 'User registered successfully' })
  } catch (error) {
    console.error('Error hashing password:', error)
    return response.status(500).send({ message: 'Internal server error' })
  }
})

// Auth endpoint for v2 - Logs in users and generates JWT access and refresh tokens.
app.post('/v2/auth', async (request, response) => {
  const { username, password } = request.body

  if (!username || !password) {
    return response
      .status(400)
      .send({ message: 'Missing username or password' })
  }

  try {
    const matchedUser = users.find((user) => user.username === username)
    if (!matchedUser) {
      return response
        .status(401)
        .send({ message: 'Unauthorized: User not found' })
    }

    // Compare passwords with bcrypt
    const isPasswordValid = await bcrypt.compare(password, matchedUser.password)
    if (!isPasswordValid) {
      return response
        .status(401)
        .send({ message: 'Unauthorized: Invalid password' })
    }

    // Generate a JWT token (expires in 2 hours)
    const accessToken = jwt.sign(
      {
        username: matchedUser.username,
        role: matchedUser.role,
      },
      SECRET_KEY,
      { expiresIn: '2h' }
    )

    // Generate refresh token (expires in 7 days)
    const refreshToken = jwt.sign(
      {
        username: matchedUser.username,
        role: matchedUser.role,
      },
      REFRESH_SECRET_KEY,
      { expiresIn: '7d' }
    )

    // Store the refresh token in memory (should use a secure database or cookies for production)
    refreshTokens.push(refreshToken)

    return response.status(200).send({
      message: 'Authentication successful',
      accessToken,
      refreshToken,
    })
  } catch (error) {
    console.error('Error during authentication:', error)
    return response.status(500).send({ message: 'Internal server error' })
  }
})

// Refresh token endpoint - Generates a new access token using a valid refresh token
app.post('/v2/refresh', (request, response) => {
  const { refreshToken } = request.body

  if (!refreshToken) {
    return response.status(401).send({ message: 'No refresh token provided' })
  }

  if (!refreshTokens.includes(refreshToken)) {
    return response
      .status(403)
      .send({ message: 'Invalid or expired refresh token' })
  }

  jwt.verify(refreshToken, REFRESH_SECRET_KEY, (err, user) => {
    if (err) {
      return response.status(403).send({ message: 'Invalid refresh token' })
    }

    // Generate a new access token
    const newAccessToken = jwt.sign(
      {
        username: user.username,
        role: user.role,
      },
      SECRET_KEY,
      { expiresIn: '1h' }
    )

    return response.status(200).send({
      accessToken: newAccessToken,
    })
  })
})

// Add a vehicle to the user's list (using Bearer token)
app.post('/v2/add-vehicle', (request, response) => {
  const authHeader = request.headers['authorization']

  if (!authHeader) {
    return response
      .status(400)
      .send({ message: 'No authorization header provided' })
  }

  const token = authHeader.split(' ')[1] // Extract token from the "Bearer <token>" string
  if (!token) {
    return response.status(400).send({ message: 'No access token provided' })
  }

  try {
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        return response
          .status(403)
          .send({ message: 'Invalid or expired token' })
      }

      // Find the user based on the username decoded from the token
      const matchedUser = users.find((u) => u.username === user.username)
      if (!matchedUser) {
        return response.status(404).send({ message: 'User not found' })
      }

      // Extract vehicle data from the request body
      const { vehicle } = request.body
      if (
        !vehicle ||
        !vehicle.year ||
        !vehicle.make ||
        !vehicle.model ||
        !vehicle.trim ||
        !vehicle.trim.name ||
        !vehicle.trim.gid
      ) {
        return response
          .status(400)
          .send({ message: 'Missing vehicle information' })
      }

      // Add the vehicle to the user's vehicle list
      const newVehicle = {
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: {
          name: vehicle.trim.name,
          gid: vehicle.trim.gid,
        },
      }
      matchedUser.vehicles.push(newVehicle)

      return response.status(200).send({
        message: 'Vehicle added successfully',
        vehicles: matchedUser.vehicles,
      })
    })
  } catch (error) {
    console.error('Error adding vehicle:', error)
    return response.status(500).send({ message: 'Internal server error' })
  }
})

// Get user data (vehicles) based on JWT authentication with Bearer token
app.get('/v2/userdata', (request, response) => {
  const authHeader = request.headers['authorization']

  if (!authHeader) {
    return response
      .status(400)
      .send({ message: 'No authorization header provided' })
  }

  const token = authHeader.split(' ')[1] // Extract token from the "Bearer <token>" string
  if (!token) {
    return response.status(400).send({ message: 'No access token provided' })
  }

  try {
    // Verify the access token
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        return response
          .status(403)
          .send({ message: 'Invalid or expired token' })
      }

      // Find the user based on the username decoded from the token
      const matchedUser = users.find((u) => u.username === user.username)
      if (!matchedUser) {
        return response.status(404).send({ message: 'User not found' })
      }

      // Return the user's vehicles
      const vehicles = matchedUser.vehicles.map((vehicle) => {
        return `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim.name}`
      })

      return response.status(200).send({
        username: matchedUser.username,
        vehicles: vehicles,
      })
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    return response.status(500).send({ message: 'Internal server error' })
  }
})

// Logout endpoint - Removes a refresh token from the list of valid tokens.
app.post('/v2/logout', (request, response) => {
  const { refreshToken } = request.body

  // Check if the refresh token is provided
  if (!refreshToken) {
    return response.status(400).send({ message: 'No refresh token provided' })
  }

  // Check if the refresh token exists in the list of valid tokens
  const tokenIndex = refreshTokens.indexOf(refreshToken)
  if (tokenIndex === -1) {
    return response.status(404).send({ message: 'Refresh token not found' })
  }

  // Remove the refresh token from the list
  refreshTokens.splice(tokenIndex, 1)

  return response.status(200).send({ message: 'Logged out successfully' })
})

// Error handling middleware to catch all unhandled routes.
app.use((request, response) => {
  response.status(404).send({ message: 'Route not found' })
})

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
