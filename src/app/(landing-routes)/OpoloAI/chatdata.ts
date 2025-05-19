const chatData = {
  today: [
    {
      id: 1,
      title: "Anxiety",
      messages: [
        {
          response: "What is anxiety?",
          answer: {
            text: "Anxiety is an emotional response characterized by feelings of tension, worried thoughts, and physical changes like increased blood pressure. It can be normal or pathological when excessive.",
            images: [
              "/images/anxiety1.png",
              "/images/anxiety_brain_activity.png",
            ],
            sources: [
              "https://www.nimh.nih.gov/health/topics/anxiety-disorders",
              "https://www.healthline.com/health/anxiety",
            ],
          },
        },
        {
          response: "What are common symptoms of anxiety?",
          answer: {
            text: "Symptoms include restlessness, rapid heartbeat, sweating, difficulty concentrating, irritability, and sleep disturbances.",
            images: ["/images/anxiety_symptoms_chart.png"],
            sources: [
              "https://www.psychiatry.org/patients-families/anxiety-disorders/what-are-anxiety-disorders",
              "https://www.webmd.com/anxiety-panic/guide/anxiety-disorders",
            ],
          },
        },
        {
          response: "How can anxiety be treated?",
          answer: {
            text: "Treatment may involve cognitive behavioral therapy (CBT), medications such as SSRIs, relaxation techniques, and lifestyle changes.",
            images: ["/images/cbt_therapy.png", "/images/medication_pills.png"],
            sources: [
              "https://www.psychiatry.org/patients-families/anxiety-disorders/treatment",
              "https://www.mayoclinic.org/diseases-conditions/anxiety/diagnosis-treatment/drc-20350967",
            ],
          },
        },
      ],
    },

    {
      id: 2,
      title: "Depression",
      messages: [
        {
          response: "What is depression?",
          answer: {
            text: "Depression is a mood disorder characterized by persistent sadness, loss of interest, and various physical and emotional problems.",
            images: [
              "/images/depression_brain.png",
              "/images/depression_symptoms.png",
            ],
            sources: [
              "https://www.nimh.nih.gov/health/topics/depression",
              "https://www.healthline.com/health/depression",
            ],
          },
        },
        {
          response: "What causes depression?",
          answer: {
            text: "Causes include genetic, biological, environmental, and psychological factors, often interacting together.",
            images: ["/images/depression_causes_diagram.png"],
            sources: [
              "https://www.apa.org/topics/depression/causes",
              "https://www.cdc.gov/mentalhealth/learn/index.htm",
            ],
          },
        },
        {
          response: "What treatments are effective for depression?",
          answer: {
            text: "Effective treatments include antidepressants, psychotherapy, lifestyle changes, and in severe cases, electroconvulsive therapy (ECT).",
            images: [
              "/images/antidepressants.png",
              "/images/psychotherapy_session.png",
            ],
            sources: [
              "https://www.mayoclinic.org/diseases-conditions/depression/diagnosis-treatment/drc-20356013",
              "https://www.nimh.nih.gov/health/topics/depression#part_145397",
            ],
          },
        },
      ],
    },
  ],
  "Past 7 days": [
    {
      id: 3,
      title: "Stress",
      messages: [
        {
          response: "What is stress?",
          answer: {
            text: "Stress is the body's reaction to any demand or challenge, which can be physical, emotional, or psychological.",
            images: ["/images/stress_response.png"],
            sources: [
              "https://www.apa.org/topics/stress",
              "https://www.healthline.com/health/stress",
            ],
          },
        },
        {
          response: "What are the signs of chronic stress?",
          answer: {
            text: "Signs include fatigue, headaches, irritability, difficulty sleeping, and weakened immune function.",
            images: ["/images/stress_symptoms.png"],
            sources: [
              "https://www.webmd.com/balance/stress-management/stress-symptoms-effects_of-stress-on-the-body",
              "https://www.mayoclinic.org/healthy-lifestyle/stress-management/in-depth/stress-symptoms/art-20050987",
            ],
          },
        },
        {
          response: "How to manage and reduce stress?",
          answer: {
            text: "Techniques include mindfulness meditation, regular exercise, adequate sleep, social support, and time management.",
            images: ["/images/mindfulness.png", "/images/exercise.png"],
            sources: [
              "https://www.helpguide.org/articles/stress/stress-management.htm",
              "https://www.nimh.nih.gov/health/publications/stress",
            ],
          },
        },
      ],
    },

    {
      id: 4,
      title: "Post-Traumatic Stress Disorder (PTSD)",
      messages: [
        {
          response: "What is PTSD?",
          answer: {
            text: "PTSD is a mental health condition triggered by experiencing or witnessing a traumatic event, causing flashbacks, nightmares, and severe anxiety.",
            images: ["/images/ptsd_brain_activity.png"],
            sources: [
              "https://www.nimh.nih.gov/health/topics/post-traumatic-stress-disorder-ptsd",
              "https://www.apa.org/topics/ptsd",
            ],
          },
        },
        {
          response: "What are symptoms of PTSD?",
          answer: {
            text: "Symptoms include intrusive memories, avoidance of reminders, negative mood changes, and heightened arousal or reactivity.",
            images: ["/images/ptsd_symptoms_chart.png"],
            sources: [
              "https://www.ptsd.va.gov/understand/what/ptsd_symptoms.asp",
              "https://www.mayoclinic.org/diseases-conditions/post-traumatic-stress-disorder/symptoms-causes/syc-20355967",
            ],
          },
        },
        {
          response: "How is PTSD treated?",
          answer: {
            text: "Treatment involves psychotherapy (like trauma-focused CBT), medications, and support groups.",
            images: ["/images/therapy_session.png"],
            sources: [
              "https://www.apa.org/ptsd-guideline/treatments/psychotherapy",
              "https://www.nimh.nih.gov/health/topics/post-traumatic-stress-disorder-ptsd#part_145398",
            ],
          },
        },
      ],
    },
  ],
  Earlier: [
    {
      id: 5,
      title: "Obsessive-Compulsive Disorder (OCD)",
      messages: [
        {
          response: "What is OCD?",
          answer: {
            text: "OCD is a disorder where people have recurring, unwanted thoughts (obsessions) and behaviors (compulsions) they feel driven to repeat.",
            images: ["/images/ocd_brain_activity.png"],
            sources: [
              "https://www.nimh.nih.gov/health/topics/obsessive-compulsive-disorder-ocd",
              "https://www.apa.org/topics/ocd",
            ],
          },
        },
        {
          response: "What are common OCD symptoms?",
          answer: {
            text: "Symptoms include repetitive hand washing, checking, counting, or mental rituals to reduce anxiety caused by obsessions.",
            images: ["/images/ocd_symptoms.png"],
            sources: [
              "https://www.webmd.com/mental-health/obsessive-compulsive-disorder",
              "https://www.mayoclinic.org/diseases-conditions/obsessive-compulsive-disorder/symptoms-causes/syc-20354432",
            ],
          },
        },
        {
          response: "How is OCD treated?",
          answer: {
            text: "Treatment includes exposure and response prevention therapy (ERP), cognitive behavioral therapy (CBT), and sometimes medication like SSRIs.",
            images: [
              "/images/therapy_session.png",
              "/images/medication_pills.png",
            ],
            sources: [
              "https://iocdf.org/about-ocd/treatment/",
              "https://www.nimh.nih.gov/health/topics/obsessive-compulsive-disorder-ocd#part_145399",
            ],
          },
        },
      ],
    },

    {
      id: 6,
      title: "Bipolar Disorder",
      messages: [
        {
          response: "What is bipolar disorder?",
          answer: {
            text: "Bipolar disorder is a mental health condition characterized by extreme mood swings, including emotional highs (mania) and lows (depression).",
            images: ["/images/bipolar_brain.png"],
            sources: [
              "https://www.nimh.nih.gov/health/topics/bipolar-disorder",
              "https://www.healthline.com/health/bipolar-disorder",
            ],
          },
        },
        {
          response: "What are the symptoms of bipolar disorder?",
          answer: {
            text: "Symptoms include mania (high energy, reduced need for sleep, impulsive behavior) and depression (sadness, fatigue, loss of interest).",
            images: ["/images/bipolar_symptoms_chart.png"],
            sources: [
              "https://www.mayoclinic.org/diseases-conditions/bipolar-disorder/symptoms-causes/syc-20355955",
              "https://www.webmd.com/bipolar-disorder/guide/bipolar-disorder",
            ],
          },
        },
        {
          response: "How is bipolar disorder treated?",
          answer: {
            text: "Treatment often involves mood stabilizers, psychotherapy, lifestyle management, and sometimes antipsychotic medications.",
            images: ["/images/medications.png", "/images/therapy_session.png"],
            sources: [
              "https://www.nimh.nih.gov/health/topics/bipolar-disorder#part_145400",
              "https://www.psychiatry.org/patients-families/bipolar-disorder/treatment",
            ],
          },
        },
      ],
    },
  ],
}
export default chatData
