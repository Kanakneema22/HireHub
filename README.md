# HireHub

HireHub is a MERN job board for job seekers and employers. It includes searchable listings, profiles and resumes, applications, employer review, saved jobs, and in-app application status notifications.

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB Atlas or local MongoDB

## Run locally

1. Copy `server/.env.example` to `server/.env` and fill in `MONGODB_URI` and a random `JWT_SECRET` (32+ characters). Keep that file private.
2. Start the API:

       cd server
       npm install
       npm run seed
       npm run dev

3. In a second terminal, start the frontend:

       cd client
       npm install
       npm run dev

4. Open the Vite URL, usually `http://localhost:5173`.

Job seekers can bookmark a role and find it under **Saved jobs**. Employer application status changes appear in the candidate’s notification bell and are checked every minute while signed in.

## Tests and production build

       cd server
       npm test

       cd ../client
       npm run lint
       npm run build

The server tests use Node’s built-in test runner. The object storage test stubs HTTP requests locally and does not need cloud credentials.

## Private resume and photo storage

Development uses the existing MongoDB file fields unless object storage is configured. Production profile uploads require a **private S3-compatible bucket**. AWS S3 and Cloudflare R2 are supported through the S3 API; set these on the server:

- `S3_ENDPOINT` — S3 API endpoint (for example, the account endpoint for R2).
- `S3_BUCKET` — private bucket name.
- `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` — restricted credentials for that bucket.
- `S3_REGION` — use `auto` for R2 or the bucket’s AWS region.

The API signs object requests and serves files only after HireHub’s profile/application authorization checks. Do not make the bucket public or expose storage credentials to the client.

To copy existing MongoDB profile files to the configured bucket, set the S3 variables in `server/.env`, then run:

       cd server
       npm run migrate:files

This first pass copies files and keeps the MongoDB source buffers. Verify profile photo and resume downloads before the optional cleanup pass:

       npm run migrate:files -- --remove-source

The cleanup pass removes MongoDB file buffers only when a matching object-storage key is present. Do not run it until the copied objects have been verified.

## Container deployment setup

A single-origin Docker image builds the React client and serves it from the Express API, so the HttpOnly login cookie remains same-site and the client can use relative `/api` requests.

1. Configure `server/.env` with a production `MONGODB_URI`, strong `JWT_SECRET`, and all private `S3_*` storage values.
2. From the project root, build and run the container:

       docker compose up --build

3. Check `http://localhost:5000/api/health`. For a public deployment, use a Docker-capable host, set the same variables in its secret environment settings, and deploy this Dockerfile. Allow the host to connect to MongoDB Atlas; keep `.env` out of the image and repository.

The container listens on the host-provided `PORT` (5000 locally) and serves the frontend plus API from one origin. `CLIENT_URL` is used for any cross-origin frontend; set it to the exact HTTPS client origin if you split the services. Set `VITE_API_URL` only when the API is on a separate origin.

## Main routes

- `GET /api/health`
- `GET /api/jobs`, `GET /api/jobs/:id`
- Authentication under `/api/auth`
- Profiles and private files under `/api/profile`
- Applications and applicant resume access under `/api/applications`
- Saved jobs under `/api/saved-jobs`
- Candidate notifications under `/api/notifications`
- Employer job and applicant management under `/api/jobs` and `/api/applications`

Production uses HTTPS-only secure authentication cookies. Do not upload `.env` files to hosting providers; enter values through their secret environment settings.
