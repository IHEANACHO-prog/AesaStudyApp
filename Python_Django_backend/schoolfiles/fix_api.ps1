$file = "E:\AESA-STUDY\Typescript-react Frontend\app\src\api\client.ts"
$content = Get-Content $file -Raw
$content = $content -replace '(?s)const API_BASE_URL =\s*\(typeof import\.meta.*?\|\|\s*''http://localhost:8000/api'';', 'const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''http://localhost:8000/api'';'
Set-Content $file $content
