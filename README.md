# Autoninjas Auth

## Overview

This project is a simple Node.js authentication server built with Express. It demonstrates the implementation of user authentication and authorization using various techniques such as basic authentication, bcrypt for password hashing, and JWT tokens for secure access.

---

## Features of v2

### User Registration

**Allows users to register with a username and password, with hashed passwords stored securely via hashing.**

- **Endpoint:** POST /v2/register
- **Sample request body:**

```json
{
  "username": "test@email.com",
  "password": "Password123"
}
```

### User Authentication

**Authenticates users using their username and password and returns JWT tokens for access control.**

- **Endpoint:** POST /v2/auth

- **Sample request body:**

```json
{
  "username": "test@email.com",
  "password": "Password123"
}
```

### Token Refresh

**Provides an endpoint to refresh access tokens when the current one expires.**
**Endpoint:** POST /v2/refresh

- **Sample request body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Add Vehicle (own)

**Allows authenticated users to add a new vehicle to their list. The user must provide a valid Bearer token in the Authorization header and complete vehicle information in the request body.**

- **Endpoint:** POST /v2/add-vehicle

- **Headers:**

```json
{
  "Authorization": "Bearer <access_token>"
}
```

- **Sample request body:**

```json
{
  "vehicle": {
    "year": 2024,
    "make": "Toyota",
    "model": "Corolla",
    "trim": {
      "name": "LE",
      "gid": "12345"
    }
  }
}
```

### Get User Data (own)

**Provides authenticated users with access to their own data, including a list of vehicles they have registered. Authentication is required via a Bearer token in the Authorization header.**

- **Endpoint:** POST /v2/userdata

- **Sample request body:**

```json
{
  "Authorization": "Bearer <access_token>"
}
```

### Logout

**Logs out the user by removing their refresh token from the list of valid tokens, preventing the token from being used to generate new access tokens.**

- **Endpoint:** POST /v2/logout
- **Headers:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Legacy Features (from v1)

### Legacy Auth

**Decodes a header field x-api-auth and return 200 if the auth is in the global list 'credentials'**

- **Endpoint:** POST /v1/auth
- **Headers:**

```json
{
  "x-api-auth": "fjahruqhq987cb4c987q3893nx8497q5bxc7cr8wqhfd98q4crcdu"
}
```

### User Data (extra from v1)

**Given an auth token in the header (x-api-auth) return the user's list of cars as a string list.**

- **Endpoint:** POST /v1/userdata
- **Headers:**

```json
{
  "x-api-auth": "fjahruqhq987cb4c987q3893nx8497q5bxc7cr8wqhfd98q4crcdu"
}
```

---

## Technologies

- **Node.js**
- **Express**
- **bcryptjs**
- **JWT**
- **CORS**

---

## Q&A

- **What is the role of Express in a Node.js application?**: Express simplifies the process of handling HTTP requests and responses. It allows you to define routes, handle middleware, and manage incoming requests, all in a structured way.
- **What is CORS policy and why is it important?**: CORS (Cross-Origin Resource Sharing) is a security feature that restricts how resources on a web server can be requested from another domain. It's important when your frontend and backend are on different domains or ports.
- **What's actually happening when we declare: const app = express()**: We are creating an instance of the app. This is the first step in setting up an Express application. This object will hold your routes and middleware and manage incoming requests.
- **How should user data be stored?**: User data should be stored in a database, with encrypted passwords.
- **What are event listeners?**: Event listeners are functions that wait for specific events to happen in an application, like when a user clicks a button or when the system makes a change. When the event occurs, the listener kicks in to handle it. In Node.js, the EventEmitter class is used to manage these events.
- **What kinds of actions should we take in an listener?**: The actions depends on the events we're responding to. For example, when a server starts listening for requests, like with app.listen, we might log a message to confirm everything's up and running, or start other services that the application needs. For events like data changes or user interactions, listeners could trigger actions like calling an external API, sending notifications, or updating the database, or performing any other task that’s necessary based on the event.
