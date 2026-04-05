-- Update notification templates to Egyptian dialect
-- Feature 6: Automated notifications polish

UPDATE notification_templates SET template = 'يا أهلا بك يا {{name}}، استلمنا جهازك الـ {{device}} برقم {{code}}. تقدر تتابع الحالة من هنا: {{link}}' WHERE event_type = 'new_device';

UPDATE notification_templates SET template = 'بص يا {{name}}، حالة جهازك {{code}} اتغيرت وبقت {{status}}. خليك متابع معانا على اللينك ده: {{link}}' WHERE event_type = 'status_change';

UPDATE notification_templates SET template = 'مبروك! جهازك {{code}} خلص وبقى جاهز للاستلام. التكلفة {{amount}} جنيه. مستنيينك في الفرع تنورنا.' WHERE event_type = 'device_ready';

UPDATE notification_templates SET template = 'يا فندم بخصوص جهازك {{code}}، في تكلفة زيادة {{amount}} جنيه عشان {{reason}}. محتاجين موافقتك عشان نبتدي: {{link}}' WHERE event_type = 'approval_request';

UPDATE notification_templates SET template = 'تم الرد على رسالتك: {{preview}}. تقدر تشوف الرد من هنا: {{link}}' WHERE event_type = 'chat_reply';

UPDATE notification_templates SET template = 'جهازك {{code}} لسه جاهز للاستلام. مستنيينك تشرفنا في أقرب وقت.' WHERE event_type = 'reminder_3days';
