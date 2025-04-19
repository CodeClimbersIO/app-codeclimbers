#!/bin/bash

ENV=${1:-dev}
ENV_UPPER=$(echo $ENV | tr '[:lower:]' '[:upper:]')

EXCLUDES=("_shared")

NO_JWT_FUNCS=("stripe-webhook")
root_dir=$(pwd)
function_dir="$root_dir/supabase/functions"

if [ ! -d "supabase" ]; then
  echo "❌ Error: supabase directory does not exist!"
  echo "Make sure you're running this script from the project root directory."
  exit 1
fi

echo "📦 Creating backup of supabase directory..."
cp -r supabase supabase-tmp


cd $function_dir

echo "🚀 Preparing functions for $ENV environment..."

for dir in */; do
  dir=${dir%*/}

    
  new_folder_name="$ENV-$dir"

  echo "🔄 Replacing placeholders in $new_folder_name with $ENV_UPPER environment values..."
  find "$new_folder_name" -type f -name "*.ts" -exec sed -i "" "s/__\([A-Z0-9_]*\)__/${ENV_UPPER}_\1/g" {} \;
  
  if [[ " ${EXCLUDES[@]} " =~ " ${dir} " ]]; then
    echo "⏭️  Skipping $dir (excluded directory)"
    continue
  fi
  
  mv "$dir" "$new_folder_name"
  

  echo "📝 Prepared $new_folder_name"
done

echo "🔄 Replacing placeholders in _shared folder..."
find "$function_dir/_shared" -type f -name "*.ts" -exec sed -i "" "s/__\([A-Z0-9_]*\)__/${ENV_UPPER}_\1/g" {} \;

echo "🚀 Deploying functions to $ENV environment..."

for dir in */; do
  dir=${dir%*/}
  
  if [[ " ${EXCLUDES[@]} " =~ " ${dir} " ]]; then
    continue
  fi
  
  original_name=${dir#"$ENV-"}
  jwt_flag=""
  if [[ " ${NO_JWT_FUNCS[@]} " =~ " ${original_name} " ]]; then
    jwt_flag="--no-verify-jwt"
    echo "🔓 Deploying $dir with JWT verification disabled"
  else
    echo "🔒 Deploying $dir with JWT verification enabled"
  fi
  
  cd $root_dir
  echo "npx supabase functions deploy $dir $jwt_flag --project-ref wnwyftlrmrtfkshyenlc"
  npx supabase functions deploy "$dir" $jwt_flag --project-ref "wnwyftlrmrtfkshyenlc"

  if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy $dir"
    
    cd $root_dir
    
    echo "🔄 Restoring original supabase directory..."
    rm -rf supabase
    mv supabase-tmp supabase
    
    exit 1
  else
    echo "✅ Successfully deployed $dir"
  fi
done

cd $root_dir

echo "🔄 Restoring original supabase directory..."
rm -rf supabase
mv supabase-tmp supabase

echo "✨ All functions deployed to $ENV environment" 