FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config with API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend files
COPY . /usr/share/nginx/html

# Remove non-web files from the served directory
RUN rm -f /usr/share/nginx/html/Dockerfile \
    /usr/share/nginx/html/nginx.conf

EXPOSE 80
