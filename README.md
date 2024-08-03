# Simple Web App

This is a simple web application with a login system and a textbox whose content is saved to MongoDB. The application is containerized using Docker and can be deployed on a Kubernetes cluster.

## Project Structure

- `public/`: Contains static files (HTML, JS).
- `routes/`: Contains Express routes.
- `models/`: Contains Mongoose models.
- `.gitignore`: Specifies files to be ignored by Git.
- `Dockerfile`: Dockerfile for containerizing the application.
- `package.json`: Project dependencies and scripts.
- `README.md`: Project documentation.
- `server.js`: Main server file.
- `kubernetes/`: Contains Kubernetes deployment files.

## Setup and Deployment

1. Build and push the Docker image:
    ```bash
    docker build -t your-dockerhub-username/web-app:latest .
    docker push your-dockerhub-username/web-app:latest
    ```

2. Apply Kubernetes configurations:
    ```bash
    kubectl apply -f kubernetes/mongo-pvc.yaml
    kubectl apply -f kubernetes/mongo-deployment.yaml
    kubectl apply -f kubernetes/mongo-service.yaml
    kubectl apply -f kubernetes/app-deployment.yaml
    kubectl apply -f kubernetes/app-service.yaml
    kubectl apply -f kubernetes/ingress.yaml
    ```

## Usage

- Access the application at `http://your-app-domain.com`.
- The login page is available at `http://your-app-domain.com/login.html`.

Test_build