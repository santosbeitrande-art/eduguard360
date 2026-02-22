import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://somqnlmwgwszklfunyfx.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjNhNjdhYmMzLTYxOTUtNGEwYi04NzQ0LTBkODdkM2Q4ZTU5YiJ9.eyJwcm9qZWN0SWQiOiJzb21xbmxtd2d3c3prbGZ1bnlmeCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY3ODA3MDk4LCJleHAiOjIwODMxNjcwOTgsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.i7mtPR6NhbFh1D-EOy0fyTKUYanu34o-ynwjPAhii8s';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };