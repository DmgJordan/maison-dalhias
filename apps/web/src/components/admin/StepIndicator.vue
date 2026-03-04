<script setup lang="ts">
interface StepDef {
  label: string;
}

interface Props {
  steps: StepDef[];
  currentStep: number;
  completedSteps?: number[];
}

const props = withDefaults(defineProps<Props>(), {
  completedSteps: undefined,
});

function isCompleted(index: number): boolean {
  if (props.completedSteps) {
    return props.completedSteps.includes(index + 1);
  }
  return index + 1 < props.currentStep;
}

function isActive(index: number): boolean {
  return index + 1 === props.currentStep;
}
</script>

<template>
  <div class="step-indicator">
    <template v-for="(step, index) in steps" :key="index">
      <div
        class="step"
        :class="{
          'step--active': isActive(index),
          'step--completed': isCompleted(index),
        }"
      >
        <div class="step__circle">
          <svg
            v-if="isCompleted(index)"
            xmlns="http://www.w3.org/2000/svg"
            class="step__check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span class="step__label">{{ step.label }}</span>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="step__line"
        :class="{ 'step__line--done': isCompleted(index) }"
      ></div>
    </template>
  </div>
</template>

<style scoped>
.step-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 4px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.step__circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  background-color: #f3f4f6;
  color: #9ca3af;
  transition: all 0.2s;
}

.step--active .step__circle {
  background-color: #ff385c;
  color: white;
}

.step--completed .step__circle {
  background-color: #10b981;
  color: white;
}

.step__check {
  width: 14px;
  height: 14px;
}

.step__label {
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
}

.step--active .step__label {
  color: #ff385c;
  font-weight: 600;
}

.step--completed .step__label {
  color: #10b981;
}

.step__line {
  flex: 1;
  height: 2px;
  background-color: #e5e7eb;
  margin: 0 12px;
  border-radius: 1px;
}

.step__line--done {
  background-color: #10b981;
}

@media (min-width: 768px) {
  .step-indicator {
    padding: 0;
  }

  .step__circle {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .step__check {
    width: 15px;
    height: 15px;
  }

  .step__label {
    font-size: 14px;
  }

  .step__line {
    margin: 0 16px;
  }
}
</style>
