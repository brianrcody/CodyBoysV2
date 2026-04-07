#!/bin/bash

MONTHS=("" "January" "February" "March" "April" "May" "June"
        "July" "August" "September" "October" "November" "December")

BASE="$(pwd)"

find "$BASE" -mindepth 4 -maxdepth 4 -type f | sort | while read -r filepath; do
    rel="${filepath#$BASE/}"
    year=$(echo "$rel" | cut -d/ -f1)
    month=$(echo "$rel" | cut -d/ -f2)
    day=$(echo "$rel" | cut -d/ -f3)
    filename=$(basename "$filepath")

    [[ "$year" =~ ^[0-9]{4}$ ]] || continue
    [[ "$month" =~ ^[0-9]{2}$ ]] || continue
    [[ "$day" =~ ^[0-9]{2}$ ]] || continue

    month_num=$((10#$month))
    day_num=$((10#$day))
    month_name="${MONTHS[$month_num]}"

    dest_dir="$BASE/Nate and Finn, $month_name $year"
    mkdir -p "$dest_dir"

    dest="$dest_dir/$filename"

    if [ -e "$dest" ]; then
        ext="${filename##*.}"
        base="${filename%.*}"
        dest="$dest_dir/${base}_${day_num}.${ext}"
        counter=2
        while [ -e "$dest" ]; do
            dest="$dest_dir/${base}_${day_num}_${counter}.${ext}"
            ((counter++))
        done
    fi

    mv "$filepath" "$dest"
done

# Remove now-empty YYYY/MM/DD directories
find "$BASE" -mindepth 1 -maxdepth 4 -depth -type d -empty -delete
