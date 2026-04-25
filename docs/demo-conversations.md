# Demo Conversations

These sample conversations are safe fake data for portfolio demos. They show the intended Arabic customer experience while keeping implementation details in English.

## Physical Therapy: Hot Lead

Customer:
مساء الخير، محتاج جلسة علاج طبيعي لأسفل الظهر في فرع مدينة نصر بكرة لو ينفع. رقمي 01044440001.

Bot:
أهلا بحضرتك، سلامتك. أقدر أسجل طلبك للاستقبال بدون تشخيص داخل المحادثة. هل لديك ميزانية تقريبية أو وقت مفضل للتواصل؟

Customer:
مناسب بعد العصر، والميزانية حوالي ٨٠٠ إلى ١٢٠٠ جنيه.

Bot:
تمام، سجلت التفاصيل ليستطيع فريق الاستقبال مراجعة الطلب والتواصل معك. لا يوجد تشخيص أو تأكيد موعد داخل المحادثة قبل مراجعة الفريق.

Expected result:

- Service: Back pain physiotherapy
- Location: Nasr City Branch
- Timeline: tomorrow
- Phone: captured
- Status: Hot
- Admin notification: yes

## Physical Therapy: Warm Lead

Customer:
كام سعر جلسة المانيوال؟

Bot:
الأسعار النهائية يراجعها فريق الاستقبال حسب الخدمة والفرع. هل تبحث عن فرع مدينة نصر، المعادي، أم التجمع؟

Customer:
لسه بشوف الأسعار بس، ممكن التفاصيل؟

Bot:
أكيد. سجلت إنك مهتم باستفسار Manual therapy، ويمكن للفريق توضيح التفاصيل بدون تأكيد سعر نهائي قبل المراجعة.

Expected result:

- Service: Manual therapy inquiry
- Status: Warm
- Follow-up: queued in production, customer sending disabled when `DEMO_MODE=true`

## Dental Clinic: Hot Lead

Customer:
مساء الخير، محتاج استشارة زراعة أسنان الأسبوع ده. عندي أشعة جاهزة وميزانيتي حوالي ٢٥ ألف.

Bot:
أهلا بحضرتك. هل يمكنك إرسال رقم هاتف حتى يتواصل معك فريق الاستقبال لتأكيد التفاصيل؟

Customer:
رقمي 01011110001 وممكن حد يكلمني النهارده؟

Bot:
تمام، سجلت التفاصيل وسأرسلها لفريق الاستقبال للمراجعة والتواصل معك. لا يوجد تأكيد موعد أو سعر نهائي قبل مراجعة الفريق.

Expected result:

- Service: زراعة الأسنان
- Budget: 25000 EGP
- Timeline: this week
- Status: Hot
- Admin notification: yes

## Online Course: Hot Lead

Customer:
عايز أشترك في كورس Data Analysis وأبدأ الأسبوع ده. ميزانيتي حوالي ٥ آلاف.

Bot:
ممتاز. هل يمكنك إرسال رقم هاتف أو طريقة تواصل مفضلة حتى يتابع معك فريق القبول؟

Customer:
رقمي 01033330001 ومحتاج أعرف الخطوات.

Bot:
تمام، سجلت بياناتك وسأرسل الطلب لفريق القبول للمراجعة والتواصل معك. لا يوجد تأكيد اشتراك أو خصم قبل مراجعة الفريق.

Expected result:

- Service: الاشتراك في كورس فردي
- Budget: 5000 EGP
- Timeline: this week
- Status: Hot
- Admin notification: yes

## Cold Lead

Customer:
عايز اعرف التفاصيل

Bot:
أكيد. ما الخدمة التي تحتاجها بالتحديد؟

Customer:
لسه مش محدد.

Bot:
لا مشكلة. عندما يكون لديك طلب واضح، أرسل التفاصيل وسنساعدك بالخطوة المناسبة.

Expected result:

- Service: missing
- Status: Cold
- Follow-up: none
