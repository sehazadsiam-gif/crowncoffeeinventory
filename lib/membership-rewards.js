/**
 * lib/membership-rewards.js
 *
 * ─────────────────────────────────────────────────────────────────────
 * AUTO-ROTATING 5-VISIT REWARD CYCLE ENGINE
 *
 * Visit 1: 5% Discount
 * Visit 2: 1 Complimentary Coffee
 * Visit 3: 10% Discount
 * Visit 4: Rotates between Juice (Cycle 1,3,5...) and Mocktail (Cycle 2,4,6...)
 * Visit 5: Rotates between Pizza @ ৳99 (Cycle 1), BOGO Breakfast (Cycle 2), 15% Off (Cycle 3)
 * ─────────────────────────────────────────────────────────────────────
 */

export function getMemberCycleReward(totalVisits = 1) {
  const visits = Math.max(1, Number(totalVisits) || 1)
  
  // Cycle Index: 0 for Visits 1-5, 1 for Visits 6-10, 2 for Visits 11-15...
  const cycleIndex = Math.floor((visits - 1) / 5)
  const cycleNumber = cycleIndex + 1
  
  // Visit number in current 5-visit cycle (1, 2, 3, 4, or 5)
  const visitInCycle = ((visits - 1) % 5) + 1

  let rewardType = 'discount' // 'discount' | 'free_coffee' | 'free_juice' | 'free_mocktail' | 'pizza_offer' | 'bogo_breakfast' | 'percent_15'
  let rewardTitle = ''
  let rewardDescription = ''
  let discountPercent = 0
  let isFreeItem = false

  if (visitInCycle === 1) {
    rewardType = 'discount'
    rewardTitle = '5% Discount'
    rewardDescription = 'Enjoy 5% off on your total bill today!'
    discountPercent = 5
  } else if (visitInCycle === 2) {
    rewardType = 'free_coffee'
    rewardTitle = '1 Complimentary Coffee ☕'
    rewardDescription = 'Enjoy 1 complimentary house coffee with your visit!'
    isFreeItem = true
  } else if (visitInCycle === 3) {
    rewardType = 'discount'
    rewardTitle = '10% Discount'
    rewardDescription = 'Enjoy 10% off on your total bill today!'
    discountPercent = 10
  } else if (visitInCycle === 4) {
    const v4Rotation = cycleIndex % 2
    if (v4Rotation === 0) {
      rewardType = 'free_juice'
      rewardTitle = '1 Complimentary Fresh Juice 🍹'
      rewardDescription = 'Enjoy 1 complimentary fresh juice with your visit!'
      isFreeItem = true
    } else {
      rewardType = 'free_mocktail'
      rewardTitle = '1 Complimentary Mocktail 🍸'
      rewardDescription = 'Enjoy 1 complimentary handcrafted mocktail with your visit!'
      isFreeItem = true
    }
  } else if (visitInCycle === 5) {
    const v5Rotation = cycleIndex % 3
    if (v5Rotation === 0) {
      rewardType = 'pizza_offer'
      rewardTitle = 'Buy 12" Pizza & Get 9" Pizza for ৳99 🍕'
      rewardDescription = 'Order any 12-inch Pizza and get a 9-inch Pizza for just ৳99!'
    } else if (v5Rotation === 1) {
      rewardType = 'bogo_breakfast'
      rewardTitle = 'Buy 1 Get 1 (BOGO) Breakfast 🍳'
      rewardDescription = 'Order any 1 drink & enjoy Buy 1 Get 1 Free on Breakfast!'
    } else {
      rewardType = 'percent_15'
      rewardTitle = '15% Discount 🎁'
      rewardDescription = 'Grand milestone reward: Enjoy 15% off on your total bill today!'
      discountPercent = 15
    }
  }

  // Calculate full 5-step roadmap for current cycle
  const v4Rot = cycleIndex % 2
  const v5Rot = cycleIndex % 3

  const roadmap = [
    { step: 1, title: '5% Discount', isCurrent: visitInCycle === 1 },
    { step: 2, title: '1 Free Coffee ☕', isCurrent: visitInCycle === 2 },
    { step: 3, title: '10% Discount', isCurrent: visitInCycle === 3 },
    {
      step: 4,
      title: v4Rot === 0 ? 'Free Fresh Juice 🍹' : 'Free Mocktail 🍸',
      isCurrent: visitInCycle === 4
    },
    {
      step: 5,
      title: v5Rot === 0 ? 'Pizza @ ৳99 🍕' : v5Rot === 1 ? 'BOGO Breakfast 🍳' : '15% Discount 🎁',
      isCurrent: visitInCycle === 5
    }
  ]

  return {
    totalVisits: visits,
    cycleNumber,
    visitInCycle,
    rewardType,
    rewardTitle,
    rewardDescription,
    discountPercent,
    isFreeItem,
    roadmap
  }
}
