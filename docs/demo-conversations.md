# Demo Conversations

Safe fake Arabic/Egyptian Arabic messages for MoveWell Physical Therapy Centers.

## Lower Back Pain

Customer:

```text
محتاج جلسة علاج طبيعي لأسفل الظهر في فرع مدينة نصر بكرة. رقمي 01044440001
```

Expected bot behavior:

- Extracts `Back pain physiotherapy`.
- Extracts `Nasr City Branch`.
- Extracts `tomorrow` and phone.
- Does not diagnose or recommend exercises.
- Routes the request for staff review.

## Post-ACL Surgery Rehab

```text
أنا عاملة عملية رباط صليبي ومحتاجة متابعة علاج طبيعي في المعادي الأسبوع ده. رقمي 01044440002
```

Expected behavior: classify as Hot/Warm depending on timing/contact completeness and remind that staff will review before any plan.

## Sports Injury

```text
اتصبت في ماتش كورة وعايز حد يكلمني عن علاج طبيعي في التجمع النهارده. 01044440003
```

Expected behavior: Hot lead, New Cairo Branch, sports injury rehabilitation, urgent.

## Home Physiotherapy

```text
ممكن جلسة علاج طبيعي في البيت لوالدتي في مصر الجديدة خلال يومين؟
```

Expected behavior: ask for phone or preferred contact method. Do not confirm coverage or availability.

## Neck Pain From Desk Work

```text
عندي وجع في الرقبة من الشغل وعايزة أعرف تفاصيل الجلسات في مدينة نصر
```

Expected behavior: extract neck service and branch, ask one missing question about timing or phone.

## Price-Only Manual Therapy

```text
كام سعر جلسة المانيوال؟
```

Expected behavior: Warm lead, ask branch or contact details. Do not quote final price.

## Vague Inquiry

```text
عايز اعرف التفاصيل
```

Expected behavior: ask one clear question about the service/condition area.
