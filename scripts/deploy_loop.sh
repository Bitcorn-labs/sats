#!/bin/bash

# This loop will run until the deploy is successful
while true; do
  echo "Attempting to deploy..."
  
  # Run the dfx deploy command
  dfx deploy --network ic
  
  # Check if the last command was successful
  if [[ $? -eq 0 ]]; then
    echo "Deployment successful!"
    break
  else
    echo "Deployment failed. Retrying..."
  fi
  
  # Optionally, add a sleep interval to avoid overwhelming the network
  sleep 1
done
