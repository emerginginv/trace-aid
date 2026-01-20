
import os

filepath = 'supabase/migrations/20260120120000_lovable_export.sql'

with open(filepath, 'r') as f:
    lines = f.readlines()

# Indices are 0-based, so subtract 1 from the grep line numbers
# PART 2 Start: Line 46 -> Index 45
# PART 3 Start: Line 183 -> Index 182
# PART 11 Start: Line 885 -> Index 884

idx_part2 = 46 - 1
idx_part3 = 183 - 1
idx_part11 = 885 - 1

part1 = lines[:idx_part2]
part2 = lines[idx_part2:idx_part3]
middle = lines[idx_part3:idx_part11]
rest = lines[idx_part11:]

# New Order: Part 1 -> Middle (Part 3-10) -> Part 2 -> Rest (Part 11+)
new_content = part1 + middle + part2 + rest

with open(filepath, 'w') as f:
    f.writelines(new_content)

print("Successfully reordered migration file.")
